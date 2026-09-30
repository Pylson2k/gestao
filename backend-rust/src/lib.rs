pub mod modules;
pub mod state;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};

use crate::state::AppState;

/// Monta o router completo do backend Rust (usado pelo binário e pelos testes de integração).
pub fn build_app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(modules::health::health))
        .nest(
            "/v2",
            modules::v2::router().route_layer(middleware::from_fn_with_state(
                state.gateway_secret.clone(),
                require_gateway_secret,
            )),
        )
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(state)
}

async fn require_gateway_secret(
    State(expected): State<String>,
    headers: HeaderMap,
    request: axum::extract::Request,
    next: Next,
) -> Response {
    if !modules::common::has_valid_gateway_secret(&headers, &expected) {
        return (StatusCode::UNAUTHORIZED, "Gateway nao autenticado").into_response();
    }
    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::build_app;
    use crate::state::AppState;
    use axum::http::{Request, StatusCode};
    use sqlx::postgres::PgPoolOptions;
    use tower::ServiceExt;

    #[tokio::test]
    async fn v2_requires_gateway_secret_and_health_remains_public() {
        let db = PgPoolOptions::new()
            .connect_lazy("postgres://user:password@localhost/test")
            .expect("lazy postgres pool");
        let app = build_app(AppState {
            db: db.clone(),
            idempotency_db: db,
            gateway_secret: "test-gateway-secret-with-at-least-32-chars".to_owned(),
        });

        let health = app
            .clone()
            .oneshot(
                Request::get("/health")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(health.status(), StatusCode::OK);

        for secret in [None, Some("wrong")] {
            let mut request = Request::get("/v2/status");
            if let Some(secret) = secret {
                request = request.header("x-gateway-secret", secret);
            }
            let response = app
                .clone()
                .oneshot(request.body(axum::body::Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        }

        let authorized = app
            .oneshot(
                Request::get("/v2/status")
                    .header(
                        "x-gateway-secret",
                        "test-gateway-secret-with-at-least-32-chars",
                    )
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(authorized.status(), StatusCode::OK);
    }
}
