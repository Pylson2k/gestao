mod modules;
mod state;

use axum::{routing::get, Router};
use state::AppState;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "gestao_rust_api=info,tower_http=info".into()),
        )
        .init();

    let state = AppState::new_from_env().await?;

    let app = Router::new()
        .route("/health", get(modules::health::health))
        .nest("/v2", modules::v2::router())
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let bind = std::env::var("RUST_API_BIND").unwrap_or_else(|_| "0.0.0.0:4000".to_string());
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    info!("rust api listening on {}", bind);
    axum::serve(listener, app).await?;
    Ok(())
}
