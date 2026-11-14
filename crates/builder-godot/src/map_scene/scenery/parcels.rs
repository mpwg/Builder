use builder_core::{MapView, Point};
use godot::classes::geometry_instance_3d::ShadowCastingSetting;
use godot::classes::mesh::{ArrayType, PrimitiveType};
use godot::classes::{ArrayMesh, Geometry2D, Node3D, StandardMaterial3D};
use godot::obj::EngineEnum;
use godot::prelude::*;

use super::{add_mesh, material};

const BLOCK_HEIGHT: f32 = 0.03;
const OUTLINE_HEIGHT: f32 = 0.07;

pub(super) fn build(world: &mut Gd<Node3D>, map: &MapView) {
    let block_surface = material(0x78935e);
    let occupied_border = material(0x4c6644);
    let vacant_border = material(0xffdf7c);

    for block in &map.blocks {
        let polygon = plane_polygon(&block.polygon);
        let indices = Geometry2D::singleton().triangulate_polygon(&polygon);
        if indices.is_empty() {
            godot_error!("Stadtblock {} lässt sich nicht triangulieren.", block.id);
            continue;
        }
        add_surface(
            world,
            &format!("BlockSurface{}", block.id),
            polygon.as_slice().iter().copied(),
            indices,
            BLOCK_HEIGHT,
            &block_surface,
        );
    }

    for parcel in &map.parcels {
        let (name, width, border) = if parcel.building_id.is_none() {
            ("VacantParcelOutline", 1.55, &vacant_border)
        } else {
            ("OccupiedParcelOutline", 0.85, &occupied_border)
        };
        let polygon = plane_polygon(&parcel.polygon);
        let points = polygon.as_slice();
        let count = points.len();
        let orientation = (0..count)
            .map(|index| points[index].cross(points[(index + 1) % count]))
            .sum::<f32>()
            .signum();
        let inset = (0..count).map(|index| {
            let previous = points[(index + count - 1) % count];
            let current = points[index];
            let next = points[(index + 1) % count];
            let before = inward_normal(current - previous, orientation);
            let after = inward_normal(next - current, orientation);
            current + (before + after) * (width / (1.0 + before.dot(after)).max(0.25))
        });
        let mut indices = PackedInt32Array::new();
        let count = count as i32;
        for a in 0..count {
            let b = (a + 1) % count;
            let outer = [a, b, b + count];
            let inner = [a, b + count, a + count];
            for mut triangle in [outer, inner] {
                if orientation < 0.0 {
                    triangle.swap(1, 2);
                }
                indices.extend(triangle);
            }
        }
        add_surface(
            world,
            &format!("{name}{}", parcel.id),
            points.iter().copied().chain(inset),
            indices,
            OUTLINE_HEIGHT,
            border,
        );
    }
}

fn plane_polygon(polygon: &[Point]) -> PackedVector2Array {
    polygon
        .iter()
        .map(|point| Vector2::new(point.x, point.z))
        .collect()
}

fn inward_normal(edge: Vector2, orientation: f32) -> Vector2 {
    Vector2::new(-edge.y, edge.x).normalized() * orientation
}

fn add_surface(
    world: &mut Gd<Node3D>,
    name: &str,
    points: impl Iterator<Item = Vector2>,
    indices: PackedInt32Array,
    height: f32,
    material: &Gd<StandardMaterial3D>,
) {
    let vertices: PackedVector3Array = points
        .map(|point| Vector3::new(point.x, height, point.y))
        .collect();
    let mut normals = PackedVector3Array::new();
    normals.resize(vertices.len());
    normals.fill(Vector3::UP);
    let mut arrays = Array::<Variant>::new();
    arrays.resize(ArrayType::MAX.ord() as usize, &Variant::nil());
    arrays.set(ArrayType::VERTEX.ord() as usize, &vertices.to_variant());
    arrays.set(ArrayType::NORMAL.ord() as usize, &normals.to_variant());
    arrays.set(ArrayType::INDEX.ord() as usize, &indices.to_variant());

    let mut mesh = ArrayMesh::new_gd();
    mesh.add_surface_from_arrays(PrimitiveType::TRIANGLES, &arrays.upcast_any_array());
    let mut instance = add_mesh(world, Vector3::ZERO, mesh.upcast(), material);
    instance.set_name(name);
    instance.set_cast_shadows_setting(ShadowCastingSetting::OFF);
}
