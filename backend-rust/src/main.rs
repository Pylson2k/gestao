use gestao_rust_api::build_app;
use gestao_rust_api::state::AppState;
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
    let app = build_app(state);

    let bind = std::env::var("RUST_API_BIND")
        .or_else(|_| std::env::var("PORT").map(|p| format!("0.0.0.0:{p}")))
        .unwrap_or_else(|_| "0.0.0.0:4000".to_string());
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    info!("rust api listening on {}", bind);
    axum::serve(listener, app).await?;
    Ok(())
}
