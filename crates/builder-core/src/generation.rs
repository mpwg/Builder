use crate::{Bounds, GameError, MapLayout, MapView, Point};

const BOUNDS: Bounds = Bounds {
    min: Point {
        x: -500.0,
        z: -350.0,
    },
    max: Point { x: 500.0, z: 350.0 },
};
mod parcels;
mod streets;

pub(crate) fn generate(seed: &str) -> Result<MapView, GameError> {
    let mut random = Random::from_seed(seed);
    let layout = if random.next() & 1 == 0 {
        MapLayout::Grid
    } else {
        MapLayout::Ring
    };
    first_valid_attempt(&mut random, |attempt_seed| {
        let mut streets = streets::trace(layout, attempt_seed)?;
        let mut parcel_random = Random(attempt_seed);
        let (parcels, buildings) =
            parcels::populate(&mut streets.blocks, &streets.roads, &mut parcel_random)?;
        Some(MapView {
            seed: seed.to_owned(),
            bounds: BOUNDS,
            layout,
            blocks: streets.blocks,
            parcels,
            ring_roads: streets.ring_roads,
            junctions: streets.junctions,
            roads: streets.roads,
            buildings,
        })
    })
}

fn first_valid_attempt<T>(
    random: &mut Random,
    mut attempt: impl FnMut(u64) -> Option<T>,
) -> Result<T, GameError> {
    (0..16)
        .find_map(|_| attempt(random.next()))
        .ok_or(GameError::NoUsableStartMap)
}

struct Random(u64);

impl Random {
    fn from_seed(seed: &str) -> Self {
        // FNV-1a über UTF-8, unabhängig von der zufälligen HashMap-Initialisierung.
        Self(seed.bytes().fold(0xcbf2_9ce4_8422_2325_u64, |hash, byte| {
            (hash ^ u64::from(byte)).wrapping_mul(0x100_0000_01b3)
        }))
    }

    fn next(&mut self) -> u64 {
        // SplitMix64 mit festgelegter Ganzzahlarithmetik für reproduzierbare Seeds.
        self.0 = self.0.wrapping_add(0x9e37_79b9_7f4a_7c15);
        let mut value = self.0;
        value = (value ^ (value >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
        value = (value ^ (value >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
        value ^ (value >> 31)
    }

    fn between(&mut self, min: f32, max: f32) -> f32 {
        let fraction = (self.next() >> 40) as f32 / 16_777_216.0;
        min + (max - min) * fraction
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn failure_exhausts_sixteen_distinct_seed_attempts() {
        let mut random = Random::from_seed("Sackgasse");
        let mut attempted = std::collections::HashSet::new();
        let result = first_valid_attempt(&mut random, |seed| {
            assert!(attempted.insert(seed));
            None::<MapView>
        });
        assert!(matches!(result, Err(GameError::NoUsableStartMap)));
        assert_eq!(attempted.len(), 16);
    }
}
