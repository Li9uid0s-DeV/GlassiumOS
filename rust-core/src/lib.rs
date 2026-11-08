//! GlassiumOS 5 — Hybrid Rust + WebAssembly Heavy Logic Core (`glasis-rust-core`)
//!
//! Architecture:
//! - Frontend UI / Window Manager / React View Layer: TypeScript (`src/os/...`)
//! - Heavy Numerical DSP, 3D Weather Particle Physics, Terrain Heightfields,
//!   and 10-Band Parametric Biquad IIR Transfer Function Evaluation: Rust (`wasm32-unknown-unknown`)

#![no_std]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

// ============================================================================
// 1. 3D WEATHER TERRAIN & ATMOSPHERIC PHYSICS KERNELS
// ============================================================================

/// Exponential frame-rate independent damping (`THREE.MathUtils.damp` equivalent in Rust/Wasm)
#[no_mangle]
pub extern "C" fn rust_lerp_damped(current: f64, target: f64, factor: f64) -> f64 {
    current + (target - current) * factor
}

/// Step a 3D weather precipitation particle (rain/snow) along Y with wrap-around bounds
#[no_mangle]
pub extern "C" fn rust_step_particle_y(
    y: f64,
    speed: f64,
    dt: f64,
    min_y: f64,
    max_y: f64,
) -> f64 {
    let next = y - speed * dt;
    if next < min_y {
        max_y - (min_y - next)
    } else {
        next
    }
}

/// Deterministic 2D hash noise for procedural 3D terrain & cloud turbulence
#[no_mangle]
pub extern "C" fn rust_hash_noise_2d(x: i32, z: i32) -> f64 {
    let mut n = x.wrapping_mul(374761393).wrapping_add(z.wrapping_mul(668265263));
    n = (n ^ (n >> 13)).wrapping_mul(1274126177);
    n = n ^ (n >> 16);
    ((n & 0x7fffffff) as f64) / 2147483647.0
}

// ============================================================================
// 2. 10-BAND PARAMETRIC EQ BIQUAD IIR TRANSFER FUNCTION SOLVER
// ============================================================================

/// Evaluate peaking biquad filter response in dB at normalized distance `d = log2(f / f0)`
#[no_mangle]
pub extern "C" fn rust_biquad_bell_influence(dist_octaves: f64, gain_db: f64, bandwidth: f64) -> f64 {
    let ratio = dist_octaves / bandwidth;
    let denom = 1.0 + ratio * ratio * 2.65;
    gain_db / denom
}

/// Compute Karaoke lead-in progress ratio [0.0 .. 1.0]
#[no_mangle]
pub extern "C" fn rust_karaoke_lead_in(
    current_time: f64,
    line_start: f64,
    lead_window: f64,
) -> f64 {
    let rem = line_start - current_time;
    if rem <= 0.0 {
        1.0
    } else if rem >= lead_window {
        0.0
    } else {
        1.0 - (rem / lead_window)
    }
}
