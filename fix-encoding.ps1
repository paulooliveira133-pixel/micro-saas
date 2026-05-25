$files = Get-ChildItem -Recurse -Include "*.tsx","*.ts" -Path "src"
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $content = $content -replace 'ç
', 'ç'
    $content = $content -replace 'í

', 'ã'
    $content = $content -replace 'á
', 'á'
    $content = $content -replace 'é
', 'é'
    $content = $content -replace 'ó
', 'ó'
    $content = $content -replace 'Ã­', 'í'
    $content = $content -replace 'õ
', 'õ'
    $content = $content -replace 'Ã ', 'à'
    $content = $content -replace 'ê
', 'ê'
    $content = $content -replace 'ô
', 'ô'
    $content = $content -replace 'Ã‡', 'Ç'
    $content = $content -replace 'Ã"', 'Ó'
    $content = $content -replace 'Ã‰', 'É'
    $content = $content -replace 'Ãš', 'Ú'
    $content = $content -replace 'â€™', "'"
    $content = $content -replace 'â€œ', '"'
    $content = $content -replace 'â€"', '–'
    $content = $content -replace 'â€¢', '•'
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Corrigido: $($file.Name)"
}
Write-Host "Pronto! Encoding corrigido em todos os arquivos!"