//! Desktop shell for Touchline Manager.
//!
//! The game itself (simulation, SQLite via sql.js, UI) runs entirely in the
//! webview. Rust only provides local file storage for save games, backups and
//! imported datasets inside the OS application-data directory. No network
//! access is used.

use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Manager};

const BUCKETS: [&str; 4] = ["saves", "backups", "datasets", "meta"];

fn safe_name(name: &str) -> Result<(), String> {
    let ok = !name.is_empty()
        && name.len() <= 120
        && !name.contains("..")
        && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.');
    if ok { Ok(()) } else { Err(format!("invalid name: {name}")) }
}

fn bucket_dir(app: &AppHandle, bucket: &str) -> Result<PathBuf, String> {
    if !BUCKETS.contains(&bucket) {
        return Err(format!("invalid bucket: {bucket}"));
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join(bucket);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
fn storage_list(app: AppHandle, bucket: String) -> Result<Vec<String>, String> {
    let dir = bucket_dir(&app, &bucket)?;
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(name) = entry.file_name().to_str() {
            if !name.ends_with(".tmp") && safe_name(name).is_ok() {
                out.push(name.to_string());
            }
        }
    }
    out.sort();
    Ok(out)
}

#[tauri::command]
fn storage_exists(app: AppHandle, bucket: String, name: String) -> Result<bool, String> {
    safe_name(&name)?;
    Ok(bucket_dir(&app, &bucket)?.join(name).is_file())
}

#[tauri::command]
fn storage_read(app: AppHandle, bucket: String, name: String) -> Result<Response, String> {
    safe_name(&name)?;
    let data = fs::read(bucket_dir(&app, &bucket)?.join(name)).map_err(|e| e.to_string())?;
    Ok(Response::new(data))
}

/// Atomic write: data goes to `<name>.tmp`, is flushed to disk, then renamed
/// over the target, so a crash can never leave a half-written save.
#[tauri::command]
fn storage_write(app: AppHandle, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(data) = request.body() else {
        return Err("expected a binary body".into());
    };
    let header = |k: &str| -> Result<String, String> {
        request
            .headers()
            .get(k)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .ok_or_else(|| format!("missing header {k}"))
    };
    let bucket = header("x-bucket")?;
    let name = header("x-name")?;
    safe_name(&name)?;
    let dir = bucket_dir(&app, &bucket)?;
    let tmp = dir.join(format!("{name}.tmp"));
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(data).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, dir.join(&name)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn storage_remove(app: AppHandle, bucket: String, name: String) -> Result<(), String> {
    safe_name(&name)?;
    let path = bucket_dir(&app, &bucket)?.join(name);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn storage_location(app: AppHandle) -> Result<String, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            storage_list,
            storage_exists,
            storage_read,
            storage_write,
            storage_remove,
            storage_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running Touchline Manager");
}

#[cfg(test)]
mod tests {
    use super::safe_name;
    #[test]
    fn rejects_path_traversal() {
        assert!(safe_name("../etc/passwd").is_err());
        assert!(safe_name("a/b").is_err());
        assert!(safe_name("").is_err());
        assert!(safe_name("career_1.sqlite").is_ok());
    }
}
