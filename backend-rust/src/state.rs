use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

impl AppState {
    pub async fn new_from_env() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL is required for rust backend"))?;
        let db = PgPoolOptions::new()
            .max_connections(10)
            .connect(&database_url)
            .await?;
        Ok(Self { db })
    }
}
