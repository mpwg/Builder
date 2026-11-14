use builder_core::{Building, BuildingKind, MapView, RoadAccess};
use godot::classes::{
    BoxMesh, CylinderMesh, Mesh, MeshInstance3D, Node3D, PrismMesh, StandardMaterial3D,
};
use godot::prelude::*;

use super::ground_position;

mod parcels;

pub(super) fn build(world: &mut Gd<Node3D>, map: &MapView) {
    let grass = material(0x63824c);
    let base = material(0x9b7e57);
    let asphalt = material(0x4e5556);
    let markings = material(0xded2ae);
    let plaster = [material(0xf5deb3), material(0xe7c6a2), material(0xf2e6cd)];
    let tiles = [material(0xad5035), material(0x923d2d), material(0xbb623f)];
    let trim = material(0x3e5153);
    let gravel = material(0xa39b85);
    let blue = material(0x2b8bc2);
    let yellow = material(0xffc142);

    let min = ground_position(map.bounds.min);
    let max = ground_position(map.bounds.max);
    let center = (min + max) * 0.5;
    let size = max - min;
    add_box(
        world,
        center + Vector3::DOWN,
        Vector3::new(size.x, 2.0, size.z),
        &grass,
    );
    add_box(
        world,
        center + Vector3::DOWN * 11.0,
        Vector3::new(size.x, 18.0, size.z),
        &base,
    );

    parcels::build(world, map);

    for junction in &map.junctions {
        let width = map
            .roads
            .iter()
            .filter(|road| road.from == junction.id || road.to == junction.id)
            .map(|road| road.width)
            .fold(0.0, f32::max);
        add_disc(
            world,
            ground_position(junction.position) + Vector3::DOWN * 0.015,
            width * 0.5,
            24,
            &asphalt,
        );
    }
    for road in &map.roads {
        let road_length: f32 = road
            .points
            .windows(2)
            .map(|points| ground_position(points[0]).distance_to(ground_position(points[1])))
            .sum();
        let mut traversed = 0.0;
        let mut next_mark = 14.0;
        for points in road.points.windows(2) {
            let a = ground_position(points[0]);
            let b = ground_position(points[1]);
            let delta = b - a;
            let length = delta.length();
            let angle = delta.x.atan2(delta.z);
            let road_surface = add_box(
                world,
                (a + b) * 0.5,
                Vector3::new(road.width, 0.4, length),
                &asphalt,
            );
            set_yaw(road_surface, angle);
            // Der Abstand läuft über die vollständige Straße, auch an kurzen Kurvensegmenten.
            while next_mark < traversed + length && next_mark < road_length - 11.0 {
                let mark = add_box(
                    world,
                    a + delta.normalized() * (next_mark - traversed) + Vector3::UP * 0.22,
                    Vector3::new(0.55, 0.04, 5.0),
                    &markings,
                );
                set_yaw(mark, angle);
                next_mark += 13.0;
            }
            traversed += length;
        }
        for points in road.points.windows(3) {
            add_disc(
                world,
                ground_position(points[1]) + Vector3::DOWN * 0.015,
                road.width * 0.5,
                24,
                &asphalt,
            );
        }
    }

    for building in &map.buildings {
        if building.kind != BuildingKind::House {
            let start = ground_position(building.access_point);
            let end = ground_position(building.position)
                + Vector3::new(building.facing.sin(), 0.0, building.facing.cos())
                    * (building.depth * 0.5);
            let path = end - start;
            let driveway = add_box(
                world,
                (start + end) * 0.5,
                Vector3::new(RoadAccess::DRIVEWAY_WIDTH, 0.2, path.length()),
                &gravel,
            );
            set_yaw(driveway, path.x.atan2(path.z));
        }
        let mut model = Node3D::new_alloc();
        model.set_name(&StringName::from(&format!("Building{}", building.id)));
        model.set_position(ground_position(building.position));
        model.set_rotation(Vector3::new(0.0, building.facing, 0.0));
        world.add_child(&model);
        let variant = building.id as usize % plaster.len();
        match building.kind {
            BuildingKind::House => add_house(
                &mut model,
                building,
                &plaster[variant],
                &tiles[variant],
                &trim,
            ),
            BuildingKind::Warehouse => {
                let Building {
                    width,
                    depth,
                    height,
                    ..
                } = *building;
                add_box(
                    &mut model,
                    Vector3::UP * (height * 0.5),
                    Vector3::new(width, height, depth * 0.78),
                    &plaster[0],
                );
                add_box(
                    &mut model,
                    Vector3::UP * height,
                    Vector3::new(width + 1.0, 1.4, depth * 0.82),
                    &trim,
                );
                add_box(
                    &mut model,
                    Vector3::new(0.0, 1.1, depth * 0.44),
                    Vector3::new(width * 0.88, 2.2, depth * 0.19),
                    &gravel,
                );
                for bay in [-0.28, 0.0, 0.28] {
                    add_box(
                        &mut model,
                        Vector3::new(width * bay, height * 0.31, depth * 0.39),
                        Vector3::new(width * 0.19, height * 0.48, 0.5),
                        &trim,
                    );
                }
            }
            BuildingKind::CircleSource | BuildingKind::TriangleSource => {
                add_box(
                    &mut model,
                    Vector3::UP * 0.25,
                    Vector3::new(building.width, 0.5, building.depth),
                    &gravel,
                );
                let radius = building.width.min(building.depth) * 0.3;
                let center = Vector3::UP * 0.7;
                if building.kind == BuildingKind::CircleSource {
                    add_disc(&mut model, center, radius, 28, &blue);
                } else {
                    let mut prism = PrismMesh::new_gd();
                    prism.set_size(Vector3::new(2.0 * radius, 2.0 * radius, 0.4));
                    let mut marker = add_mesh(&mut model, center, prism.upcast(), &yellow);
                    marker.set_name("TriangleMarker");
                    marker.set_rotation(Vector3::new(std::f32::consts::FRAC_PI_2, 0.0, 0.0));
                }
            }
        }
    }
}

fn add_house(
    model: &mut Gd<Node3D>,
    house: &Building,
    plaster: &Gd<StandardMaterial3D>,
    tiles: &Gd<StandardMaterial3D>,
    trim: &Gd<StandardMaterial3D>,
) {
    let Building {
        width,
        depth,
        height,
        ..
    } = *house;
    let eaves = height * 0.72;
    add_box(
        model,
        Vector3::UP * (eaves * 0.5),
        Vector3::new(width, eaves, depth),
        plaster,
    );

    let roof_height = height - eaves;
    let mut roof = PrismMesh::new_gd();
    roof.set_size(Vector3::new(width + 0.9, roof_height, depth + 0.9));
    add_mesh(
        model,
        Vector3::UP * (eaves + roof_height * 0.5),
        roof.upcast(),
        tiles,
    );

    for x in [-0.27, 0.27] {
        add_box(
            model,
            Vector3::new(width * x, eaves * 0.64, depth * 0.5),
            Vector3::new(width * 0.15, eaves * 0.23, 0.25),
            trim,
        );
    }
}

fn material(rgb: u32) -> Gd<StandardMaterial3D> {
    let mut material = StandardMaterial3D::new_gd();
    material.set_albedo(Color::from_rgba8(
        (rgb >> 16) as u8,
        (rgb >> 8) as u8,
        rgb as u8,
        255,
    ));
    material
}

fn set_yaw(mut instance: Gd<MeshInstance3D>, yaw: f32) {
    instance.set_rotation(Vector3::new(0.0, yaw, 0.0));
}

fn add_mesh(
    parent: &mut Gd<Node3D>,
    position: Vector3,
    mesh: Gd<Mesh>,
    material: &Gd<StandardMaterial3D>,
) -> Gd<MeshInstance3D> {
    let mut instance = MeshInstance3D::new_alloc();
    instance.set_mesh(&mesh);
    instance.set_material_override(material);
    instance.set_position(position);
    parent.add_child(&instance);
    instance
}

fn add_box(
    parent: &mut Gd<Node3D>,
    position: Vector3,
    size: Vector3,
    material: &Gd<StandardMaterial3D>,
) -> Gd<MeshInstance3D> {
    let mut mesh = BoxMesh::new_gd();
    mesh.set_size(size);
    add_mesh(parent, position, mesh.upcast(), material)
}

fn add_disc(
    parent: &mut Gd<Node3D>,
    position: Vector3,
    radius: f32,
    sides: i32,
    material: &Gd<StandardMaterial3D>,
) {
    let mut mesh = CylinderMesh::new_gd();
    mesh.set_top_radius(radius);
    mesh.set_bottom_radius(radius);
    mesh.set_radial_segments(sides);
    mesh.set_rings(0);
    mesh.set_height(0.4);
    add_mesh(parent, position, mesh.upcast(), material);
}
