use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{FromRow, PgPool};
use std::collections::HashMap;
use uuid::Uuid;

use crate::modules::common::{
    fmt_dt, is_unique_violation, require_user, resolve_material_quantity, resolve_material_unit,
    write_audit_log, ApiError, AuditEntry,
};
use crate::modules::users::{owner_db_user_ids, resolve_db_user_id};
use crate::state::AppState;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct MaterialListPayload {
    client_id: Option<Value>,
    title: Option<Value>,
    observations: Option<Value>,
    include_prices: Option<Value>,
    items: Option<Value>,
}

struct NormalizedItem {
    name: String,
    quantity: f64,
    unit: String,
    unit_price: f64,
}

#[derive(FromRow)]
struct MaterialListRow {
    id: String,
    number: String,
    user_id: String,
    client_id: String,
    title: Option<String>,
    observations: Option<String>,
    include_prices: bool,
    created_at: chrono::NaiveDateTime,
    updated_at: chrono::NaiveDateTime,
}

#[derive(FromRow)]
struct ClientBriefRow {
    id: String,
    name: String,
    phone: String,
    address: String,
    email: Option<String>,
}

#[derive(FromRow)]
struct ClientFullRow {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
    created_at: chrono::NaiveDateTime,
    updated_at: chrono::NaiveDateTime,
}

#[derive(FromRow)]
struct ItemFullRow {
    id: String,
    material_list_id: String,
    name: String,
    quantity: f64,
    unit: String,
    unit_price: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ClientBriefDto {
    id: String,
    name: String,
    phone: String,
    address: String,
    email: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ClientFullDto {
    id: String,
    name: String,
    document: Option<String>,
    phone: String,
    address: String,
    email: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ItemBriefDto {
    id: String,
    name: String,
    quantity: f64,
    unit: String,
    unit_price: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ItemFullDto {
    id: String,
    material_list_id: String,
    name: String,
    quantity: f64,
    unit: String,
    unit_price: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MaterialListListDto {
    id: String,
    number: String,
    user_id: String,
    client_id: String,
    title: Option<String>,
    observations: Option<String>,
    include_prices: bool,
    created_at: String,
    updated_at: String,
    client: ClientBriefDto,
    items: Vec<ItemBriefDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MaterialListFullDto {
    id: String,
    number: String,
    user_id: String,
    client_id: String,
    title: Option<String>,
    observations: Option<String>,
    include_prices: bool,
    created_at: String,
    updated_at: String,
    client: ClientFullDto,
    items: Vec<ItemFullDto>,
}

fn as_f64(value: &Value) -> f64 {
    match value {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s.trim().parse::<f64>().ok(),
        _ => None,
    }
    .filter(|v| v.is_finite())
    .unwrap_or(0.0)
}

fn resolve_unit_price(value: &Value) -> f64 {
    as_f64(value).max(0.0)
}

fn parse_bool(value: Option<&Value>) -> bool {
    match value {
        Some(Value::Bool(b)) => *b,
        Some(Value::String(s)) => {
            let t = s.trim();
            t.eq_ignore_ascii_case("true") || t == "1"
        }
        _ => false,
    }
}

/// `None` = não informado; `Some(None)` = informado/vazio (zera o campo).
fn text_or_null(value: Option<&Value>) -> Option<Option<String>> {
    match value {
        None => None,
        Some(Value::Null) => Some(None),
        Some(Value::String(s)) => {
            let t = s.trim();
            Some(if t.is_empty() {
                None
            } else {
                Some(t.to_string())
            })
        }
        Some(_) => Some(None),
    }
}

fn normalize_items(raw: Option<&Value>) -> Vec<NormalizedItem> {
    let arr = match raw.and_then(Value::as_array) {
        Some(a) => a,
        None => return Vec::new(),
    };
    arr.iter()
        .filter_map(|it| {
            let name = it
                .get("name")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|s| !s.is_empty())?;
            let quantity = resolve_material_quantity(it.get("quantity").unwrap_or(&Value::Null));
            let unit = resolve_material_unit(it.get("unit").and_then(Value::as_str));
            let unit_price = resolve_unit_price(it.get("unitPrice").unwrap_or(&Value::Null));
            Some(NormalizedItem {
                name: name.to_string(),
                quantity,
                unit,
                unit_price,
            })
        })
        .collect()
}

fn parse_lm_seq(number: &str) -> Option<i64> {
    let idx = number.rfind('-')?;
    number[idx + 1..].parse::<i64>().ok()
}

fn max_lm_seq(numbers: &[String]) -> i64 {
    numbers
        .iter()
        .filter_map(|n| parse_lm_seq(n))
        .max()
        .unwrap_or(0)
}

async fn fetch_client_full(pool: &PgPool, client_id: &str) -> Result<ClientFullRow, ApiError> {
    sqlx::query_as::<_, ClientFullRow>(
        r#"SELECT id, name, document, phone, address, email, "createdAt" AS created_at,
                  "updatedAt" AS updated_at
           FROM clients WHERE id = $1"#,
    )
    .bind(client_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao carregar cliente: {}", e),
        )
    })?
    .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Cliente nao encontrado"))
}

async fn fetch_items_full(pool: &PgPool, list_id: &str) -> Result<Vec<ItemFullRow>, ApiError> {
    sqlx::query_as::<_, ItemFullRow>(
        r#"SELECT id, "materialListId" AS material_list_id, name, quantity, unit,
                  "unitPrice" AS unit_price
           FROM material_list_items WHERE "materialListId" = $1 ORDER BY id"#,
    )
    .bind(list_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao carregar materiais: {}", e),
        )
    })
}

async fn build_full_dto(
    pool: &PgPool,
    row: MaterialListRow,
) -> Result<MaterialListFullDto, ApiError> {
    let client = fetch_client_full(pool, &row.client_id).await?;
    let items = fetch_items_full(pool, &row.id).await?;
    Ok(MaterialListFullDto {
        id: row.id,
        number: row.number,
        user_id: row.user_id,
        client_id: row.client_id,
        title: row.title,
        observations: row.observations,
        include_prices: row.include_prices,
        created_at: fmt_dt(row.created_at),
        updated_at: fmt_dt(row.updated_at),
        client: ClientFullDto {
            id: client.id,
            name: client.name,
            document: client.document,
            phone: client.phone,
            address: client.address,
            email: client.email,
            created_at: fmt_dt(client.created_at),
            updated_at: fmt_dt(client.updated_at),
        },
        items: items
            .into_iter()
            .map(|i| ItemFullDto {
                id: i.id,
                material_list_id: i.material_list_id,
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                unit_price: i.unit_price,
            })
            .collect(),
    })
}

struct NewList<'a> {
    list_id: &'a str,
    number: &'a str,
    user_id: &'a str,
    client_id: &'a str,
    title: Option<&'a str>,
    observations: Option<&'a str>,
    include_prices: bool,
}

async fn insert_list_with_items(
    pool: &PgPool,
    new_list: &NewList<'_>,
    items: &[NormalizedItem],
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query(
        r#"INSERT INTO material_lists (id, number, "userId", "clientId", title, observations, "includePrices", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())"#,
    )
    .bind(new_list.list_id)
    .bind(new_list.number)
    .bind(new_list.user_id)
    .bind(new_list.client_id)
    .bind(new_list.title)
    .bind(new_list.observations)
    .bind(new_list.include_prices)
    .execute(&mut *tx)
    .await?;
    for item in items {
        sqlx::query(
            r#"INSERT INTO material_list_items (id, "materialListId", name, quantity, unit, "unitPrice")
               VALUES ($1, $2, $3, $4, $5, $6)"#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(new_list.list_id)
        .bind(&item.name)
        .bind(item.quantity)
        .bind(&item.unit)
        .bind(item.unit_price)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(())
}

async fn update_list_fields(
    pool: &PgPool,
    list_id: &str,
    client_id: Option<&str>,
    title: Option<Option<&str>>,
    observations: Option<Option<&str>>,
    include_prices: Option<bool>,
    replace_items: Option<&[NormalizedItem]>,
) -> Result<(), ApiError> {
    let mut tx = pool.begin().await.map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao atualizar lista de materiais: {}", e),
        )
    })?;

    if replace_items.is_some() {
        sqlx::query(r#"DELETE FROM material_list_items WHERE "materialListId" = $1"#)
            .bind(list_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao substituir itens: {}", e),
                )
            })?;
    }

    if client_id.is_some() || title.is_some() || observations.is_some() || include_prices.is_some()
    {
        sqlx::query(
            r#"UPDATE material_lists SET
                "clientId" = COALESCE($2, "clientId"),
                title = COALESCE($3, title),
                observations = COALESCE($4, observations),
                "includePrices" = COALESCE($5, "includePrices"),
                "updatedAt" = NOW()
               WHERE id = $1"#,
        )
        .bind(list_id)
        .bind(client_id)
        .bind(title.flatten())
        .bind(observations.flatten())
        .bind(include_prices)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao atualizar lista de materiais: {}", e),
            )
        })?;
    }

    if let Some(items) = replace_items {
        for item in items {
            sqlx::query(
                r#"INSERT INTO material_list_items (id, "materialListId", name, quantity, unit, "unitPrice")
                   VALUES ($1, $2, $3, $4, $5, $6)"#,
            )
            .bind(Uuid::new_v4().to_string())
            .bind(list_id)
            .bind(&item.name)
            .bind(item.quantity)
            .bind(&item.unit)
            .bind(item.unit_price)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao criar itens da lista: {}", e),
                )
            })?;
        }
    }

    tx.commit().await.map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao finalizar atualizacao da lista: {}", e),
        )
    })?;
    Ok(())
}

async fn list(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<Vec<MaterialListListDto>>, ApiError> {
    let _user_id = require_user(&headers)?;
    let db_user_ids = owner_db_user_ids(&state.db).await;
    let rows: Vec<MaterialListRow> = sqlx::query_as::<_, MaterialListRow>(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id, title, observations,
                  "includePrices" AS include_prices, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM material_lists WHERE "userId" = ANY($1) ORDER BY "createdAt" DESC LIMIT 200"#,
    )
    .bind(&db_user_ids)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao listar listas de materiais: {}", e),
        )
    })?;

    let mut out = Vec::with_capacity(rows.len());
    if rows.is_empty() {
        return Ok(Json(out));
    }

    let client_ids: Vec<String> = rows.iter().map(|r| r.client_id.clone()).collect();
    let list_ids: Vec<String> = rows.iter().map(|r| r.id.clone()).collect();

    let clients = sqlx::query_as::<_, ClientBriefRow>(
        r#"SELECT id, name, phone, address, email FROM clients WHERE id = ANY($1)"#,
    )
    .bind(&client_ids)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao carregar clientes das listas: {}", e),
        )
    })?;

    let items = sqlx::query_as::<_, ItemFullRow>(
        r#"SELECT id, "materialListId" AS material_list_id, name, quantity, unit,
                  "unitPrice" AS unit_price
           FROM material_list_items WHERE "materialListId" = ANY($1) ORDER BY id"#,
    )
    .bind(&list_ids)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao carregar materiais das listas: {}", e),
        )
    })?;

    let client_by_id: HashMap<String, ClientBriefRow> =
        clients.into_iter().map(|c| (c.id.clone(), c)).collect();

    let mut items_by_list: HashMap<String, Vec<ItemBriefDto>> = HashMap::new();
    for item in items {
        items_by_list
            .entry(item.material_list_id)
            .or_default()
            .push(ItemBriefDto {
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
            });
    }

    for row in rows {
        let Some(client) = client_by_id.get(&row.client_id) else {
            continue;
        };
        let items = items_by_list.remove(&row.id).unwrap_or_default();
        out.push(MaterialListListDto {
            id: row.id,
            number: row.number,
            user_id: row.user_id,
            client_id: row.client_id,
            title: row.title,
            observations: row.observations,
            include_prices: row.include_prices,
            created_at: fmt_dt(row.created_at),
            updated_at: fmt_dt(row.updated_at),
            client: ClientBriefDto {
                id: client.id.clone(),
                name: client.name.clone(),
                phone: client.phone.clone(),
                address: client.address.clone(),
                email: client.email.clone(),
            },
            items,
        });
    }
    Ok(Json(out))
}

async fn get(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<MaterialListFullDto>, ApiError> {
    require_user(&headers)?;
    let db_user_ids = owner_db_user_ids(&state.db).await;
    let row: Option<MaterialListRow> = sqlx::query_as::<_, MaterialListRow>(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id, title, observations,
                  "includePrices" AS include_prices, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM material_lists WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&db_user_ids)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar lista de materiais: {}", e),
        )
    })?;

    let row = row.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Lista nao encontrada"))?;
    Ok(Json(build_full_dto(&state.db, row).await?))
}

async fn create(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(body): Json<MaterialListPayload>,
) -> Result<(StatusCode, Json<MaterialListFullDto>), ApiError> {
    let _user_id = require_user(&headers)?;

    let client_id = body
        .client_id
        .as_ref()
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "Cliente e obrigatorio"))?;

    let items = normalize_items(body.items.as_ref());
    if items.is_empty() {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Informe ao menos um material com descricao",
        ));
    }

    let client_exists: bool =
        sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM clients WHERE id = $1)"#)
            .bind(client_id)
            .fetch_one(&state.db)
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao validar cliente: {}", e),
                )
            })?;
    if !client_exists {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Cliente nao encontrado",
        ));
    }

    let db_user_id = match resolve_db_user_id(&state.db).await {
        Some(id) => id,
        None => {
            return Err(ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Falha ao mapear usuario autenticado",
            ))
        }
    };

    let title = text_or_null(body.title.as_ref()).unwrap_or(None);
    let observations = text_or_null(body.observations.as_ref()).unwrap_or(None);
    let include_prices = parse_bool(body.include_prices.as_ref());

    let year = Utc::now().format("%Y").to_string();
    let existing: Vec<String> =
        sqlx::query_scalar(r#"SELECT number FROM material_lists WHERE number LIKE $1"#)
            .bind(format!("LM-{}-%", year))
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();
    let base_number = format!("LM-{}-{:03}", year, max_lm_seq(&existing) + 1);
    let list_id = Uuid::new_v4().to_string();

    let insert_result = insert_list_with_items(
        &state.db,
        &NewList {
            list_id: &list_id,
            number: &base_number,
            user_id: &db_user_id,
            client_id,
            title: title.as_deref(),
            observations: observations.as_deref(),
            include_prices,
        },
        &items,
    )
    .await;
    let _number = match insert_result {
        Ok(_) => base_number,
        Err(err) if is_unique_violation(&err) => {
            let fallback = format!("LM-{}-{}", year, Utc::now().timestamp_millis());
            insert_list_with_items(
                &state.db,
                &NewList {
                    list_id: &list_id,
                    number: &fallback,
                    user_id: &db_user_id,
                    client_id,
                    title: title.as_deref(),
                    observations: observations.as_deref(),
                    include_prices,
                },
                &items,
            )
            .await
            .map_err(|e| {
                ApiError::new(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Erro ao criar lista de materiais: {}", e),
                )
            })?;
            fallback
        }
        Err(e) => {
            return Err(ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao criar lista de materiais: {}", e),
            ))
        }
    };

    write_audit_log(
        &state.db,
        AuditEntry {
            action: "create_material_list",
            entity_type: "materialList",
            entity_id: &list_id,
            description: &format!("Criou a lista de materiais {}", _number),
            old_value: None,
            new_value: None,
        },
        &headers,
    )
    .await;

    let row: MaterialListRow = sqlx::query_as::<_, MaterialListRow>(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id, title, observations,
                  "includePrices" AS include_prices, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM material_lists WHERE id = $1"#,
    )
    .bind(&list_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao carregar lista criada: {}", e),
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(build_full_dto(&state.db, row).await?),
    ))
}

async fn update(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<MaterialListPayload>,
) -> Result<Json<MaterialListFullDto>, ApiError> {
    require_user(&headers)?;
    let db_user_ids = owner_db_user_ids(&state.db).await;

    let existing: Option<MaterialListRow> = sqlx::query_as::<_, MaterialListRow>(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id, title, observations,
                  "includePrices" AS include_prices, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM material_lists WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&db_user_ids)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar lista de materiais: {}", e),
        )
    })?;
    let existing =
        existing.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Lista nao encontrada"))?;

    let new_client_id = body
        .client_id
        .as_ref()
        .filter(|v| !v.is_null())
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty());
    if let Some(client_id) = new_client_id {
        let exists: bool =
            sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM clients WHERE id = $1)"#)
                .bind(client_id)
                .fetch_one(&state.db)
                .await
                .map_err(|e| {
                    ApiError::new(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Erro ao validar cliente: {}", e),
                    )
                })?;
        if !exists {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "Cliente nao encontrado",
            ));
        }
    }

    let title = text_or_null(body.title.as_ref());
    let observations = text_or_null(body.observations.as_ref());
    let include_prices = body.include_prices.as_ref().map(|v| parse_bool(Some(v)));

    let replace_items = match body.items.as_ref() {
        Some(_) => {
            let items = normalize_items(body.items.as_ref());
            if items.is_empty() {
                return Err(ApiError::new(
                    StatusCode::BAD_REQUEST,
                    "Informe ao menos um material com descricao",
                ));
            }
            Some(items)
        }
        None => None,
    };

    let has_scalar_update = new_client_id.is_some()
        || title.is_some()
        || observations.is_some()
        || include_prices.is_some();
    if replace_items.is_none() && !has_scalar_update {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "Nenhum campo para atualizar",
        ));
    }

    update_list_fields(
        &state.db,
        &existing.id,
        new_client_id,
        title.as_ref().map(|v| v.as_deref()),
        observations.as_ref().map(|v| v.as_deref()),
        include_prices,
        replace_items.as_deref(),
    )
    .await?;

    write_audit_log(
        &state.db,
        AuditEntry {
            action: "update_material_list",
            entity_type: "materialList",
            entity_id: &existing.id,
            description: &format!("Atualizou a lista de materiais {}", existing.number),
            old_value: None,
            new_value: None,
        },
        &headers,
    )
    .await;

    let updated: MaterialListRow = sqlx::query_as::<_, MaterialListRow>(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id, title, observations,
                  "includePrices" AS include_prices, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM material_lists WHERE id = $1"#,
    )
    .bind(&existing.id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao carregar lista atualizada: {}", e),
        )
    })?;

    Ok(Json(build_full_dto(&state.db, updated).await?))
}

async fn delete(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    require_user(&headers)?;
    let db_user_ids = owner_db_user_ids(&state.db).await;

    let existing: Option<MaterialListRow> = sqlx::query_as::<_, MaterialListRow>(
        r#"SELECT id, number, "userId" AS user_id, "clientId" AS client_id, title, observations,
                  "includePrices" AS include_prices, "createdAt" AS created_at, "updatedAt" AS updated_at
           FROM material_lists WHERE id = $1 AND "userId" = ANY($2)"#,
    )
    .bind(&id)
    .bind(&db_user_ids)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Erro ao buscar lista de materiais: {}", e),
        )
    })?;
    let existing =
        existing.ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "Lista nao encontrada"))?;

    let client_name: Option<String> =
        sqlx::query_scalar(r#"SELECT name FROM clients WHERE id = $1"#)
            .bind(&existing.client_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);

    sqlx::query(r#"DELETE FROM material_lists WHERE id = $1"#)
        .bind(&existing.id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao excluir lista de materiais: {}", e),
            )
        })?;

    write_audit_log(
        &state.db,
        AuditEntry {
            action: "delete_material_list",
            entity_type: "materialList",
            entity_id: &existing.id,
            description: &format!(
                "Lista de materiais {} excluída — {}",
                existing.number,
                client_name.unwrap_or_default()
            ),
            old_value: None,
            new_value: None,
        },
        &headers,
    )
    .await;

    Ok(Json(serde_json::json!({ "success": true })))
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/", axum::routing::get(list).post(create))
        .route(
            "/{id}",
            axum::routing::get(get).patch(update).delete(delete),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn max_lm_seq_parses_numbers() {
        assert_eq!(max_lm_seq(&["LM-2026-001".into(), "LM-2026-007".into()]), 7);
        assert_eq!(max_lm_seq(&["LM-2025-999".into()]), 999);
        assert_eq!(max_lm_seq(&[]), 0);
    }

    #[test]
    fn normalize_items_skips_invalid() {
        let raw = serde_json::json!([
            { "name": "Tinta", "quantity": "1/2", "unit": "galao", "unitPrice": 120.5 },
            { "name": "   ", "quantity": 2, "unit": "caixa" },
            { "name": "Cimento", "quantity": "0", "unit": "saco", "unitPrice": -5 }
        ]);
        let items = normalize_items(Some(&raw));
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].name, "Tinta");
        assert_eq!(items[0].quantity, 0.5);
        assert_eq!(items[0].unit, "galao");
        assert_eq!(items[0].unit_price, 120.5);
        assert_eq!(items[1].unit_price, 0.0);
    }

    #[test]
    fn text_or_null_handles_blank() {
        assert!(text_or_null(None).is_none());
        assert_eq!(text_or_null(Some(&Value::Null)), Some(None));
        assert_eq!(
            text_or_null(Some(&Value::String("  x  ".into()))),
            Some(Some("x".into()))
        );
        assert_eq!(text_or_null(Some(&Value::String("   ".into()))), Some(None));
    }
}
