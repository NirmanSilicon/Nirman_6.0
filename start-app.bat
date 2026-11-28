@echo off
setlocal
cd /d "%~dp0"
title Krushak Drishti Server

echo Starting Krushak Drishti on http://localhost:8790/
where python >nul 2>nul && python --version >nul 2>nul && (
  start "" "http://localhost:8790/"
  python -m http.server 8790
  goto :eof
)

echo Launching Krushak Drishti PowerShell HTTP server on http://localhost:8790/ ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Get-Location).Path;" ^
  "$listener = New-Object System.Net.HttpListener;" ^
  "$listener.Prefixes.Add('http://localhost:8790/');" ^
  "$listener.Start();" ^
  "Start-Process 'http://localhost:8790/';" ^
  "Write-Host 'Krushak Drishti serving at http://localhost:8790/ (Press Ctrl+C to stop)';" ^
  "$mime = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.json'='application/json; charset=utf-8'; '.ico'='image/x-icon' };" ^
  "try {" ^
  "  while ($listener.IsListening) {" ^
  "    try {" ^
  "      $ctx = $listener.GetContext();" ^
  "      $res = $ctx.Response;" ^
  "      try {" ^
  "        $reqUrlPath = $ctx.Request.Url.AbsolutePath;" ^
  "        $res.KeepAlive = $false;" ^
  "        $res.Headers.Add('Connection', 'close');" ^
  "        if ($reqUrlPath -eq '/favicon.ico') {" ^
  "          $res.StatusCode = 204;" ^
  "          $res.ContentLength64 = 0;" ^
  "        } else {" ^
  "          $reqPath = $reqUrlPath.TrimStart('/');" ^
  "          if ([string]::IsNullOrWhiteSpace($reqPath)) { $reqPath = 'index.html' };" ^
  "          $safeRel = $reqPath.Replace('/', '\');" ^
  "          $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $safeRel));" ^
  "          if ($fullPath.StartsWith($root) -and (Test-Path -LiteralPath $fullPath -PathType Leaf)) {" ^
  "            $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant();" ^
  "            $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' };" ^
  "            $bytes = [System.IO.File]::ReadAllBytes($fullPath);" ^
  "            $res.StatusCode = 200;" ^
  "            $res.ContentLength64 = $bytes.Length;" ^
  "            $res.OutputStream.Write($bytes, 0, $bytes.Length);" ^
  "          } else {" ^
  "            $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found');" ^
  "            $res.StatusCode = 404;" ^
  "            $res.ContentType = 'text/plain; charset=utf-8';" ^
  "            $res.ContentLength64 = $msg.Length;" ^
  "            $res.OutputStream.Write($msg, 0, $msg.Length);" ^
  "          }" ^
  "        }" ^
  "      } catch {" ^
  "      } finally {" ^
  "        try { $res.OutputStream.Close(); } catch {}" ^
  "        try { $res.Close(); } catch {}" ^
  "      }" ^
  "    } catch {" ^
  "      if (-not $listener.IsListening) { break };" ^
  "    }" ^
  "  }" ^
  "} finally { try { $listener.Stop(); $listener.Close(); } catch {} }"
