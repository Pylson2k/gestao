pub mod modules;
pub mod state;

use axum::{routing::get, Router};

use crate::state::AppState;

/// Monta o router completo do backend Rust (usado pelo binário e pelos testes de integração).
pub fn build_app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(modules::health::health))
        .nest("/v2", modules::v2::router())
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(tower_http::cors::CorsLayer::permissive())
        .with_state(state)
}
