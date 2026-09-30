use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub idempotency_db: PgPool,
    pub gateway_secret: String,
}

impl AppState {
    pub async fn new_from_env() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL is required for rust backend"))?;
        let gateway_secret = std::env::var("RUST_GATEWAY_SECRET")
            .map_err(|_| anyhow::anyhow!("RUST_GATEWAY_SECRET is required for rust backend"))?;
        anyhow::ensure!(
            gateway_secret.trim().len() >= 32,
            "RUST_GATEWAY_SECRET must contain at least 32 characters"
        );
        let db = PgPoolOptions::new()
            .max_connections(10)
            .connect(&database_url)
            .await?;
        // Keep idempotency lock transactions separate: handlers may need a
        // second connection from `db` while the lock is held.
        let idempotency_db = PgPoolOptions::new()
            .max_connections(4)
            .connect(&database_url)
            .await?;
        Ok(Self {
            db,
            idempotency_db,
            gateway_secret,
        })
    }
}
