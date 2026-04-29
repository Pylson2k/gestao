use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
struct V2Status {
    version: &'static str,
    message: &'static str,
}

async fn status(State(_state): State<AppState>) -> Json<V2Status> {
    Json(V2Status {
        version: "v2",
        message: "Rust domain ready for phased rollout",
    })
}

pub fn router() -> Router<AppState> {
    Router::new().route("/status", get(status))
}
