$ErrorActionPreference = "Stop"

$assets = @(
  @{ article = "welcome"; file = "welcome-01.jpg"; title = "File:New Student Orientation Chilliwack (29240474102).jpg" },
  @{ article = "welcome"; file = "welcome-02.jpg"; title = "File:New Student Orientation Chilliwack (28727329703).jpg" },
  @{ article = "welcome"; file = "welcome-03.jpg"; title = "File:New Student Orientation Chilliwack (29240472602).jpg" },
  @{ article = "welcome"; file = "welcome-04.jpg"; title = "File:New Student Orientation Chilliwack (29269798441).jpg" },
  @{ article = "welcome"; file = "welcome-05.jpg"; title = "File:New Student Orientation Chilliwack (29240473482).jpg" },
  @{ article = "welcome"; file = "welcome-06.jpg"; title = "File:New Student Orientation Chilliwack (29240473732).jpg" },
  @{ article = "welcome"; file = "welcome-07.jpg"; title = "File:New Student Orientation Chilliwack (28727334443).jpg" },
  @{ article = "welcome"; file = "welcome-08.jpg"; title = "File:New Student Orientation Chilliwack (28727334893).jpg" },
  @{ article = "welcome"; file = "welcome-09.jpg"; title = "File:New Student Orientation Chilliwack (29269805521).jpg" },
  @{ article = "welcome"; file = "welcome-10.jpg"; title = "File:New Student Orientation Chilliwack (29240477902).jpg" },
  @{ article = "practice"; file = "practice-01.jpg"; title = "File:Students file into the river (8695411703).jpg" },
  @{ article = "practice"; file = "practice-02.jpg"; title = "File:Mitchell County students search a rock for stream insects (8019599252).jpg" },
  @{ article = "practice"; file = "practice-03.jpg"; title = "File:Students collect fish in the South Toe River (15420687205).jpg" },
  @{ article = "practice"; file = "practice-04.jpg"; title = "File:A pair of students work a D net (15397640716).jpg" },
  @{ article = "practice"; file = "practice-05.jpg"; title = "File:Students fan out across the South Toe River (15420334172).jpg" },
  @{ article = "practice"; file = "practice-06.jpg"; title = "File:Students turning river rocks (15233987560).jpg" },
  @{ article = "practice"; file = "practice-07.jpg"; title = "File:Haywood County students entering the Pigeon River (15417385271).jpg" },
  @{ article = "practice"; file = "practice-08.jpg"; title = "File:Students work their D net (15233946238).jpg" },
  @{ article = "practice"; file = "practice-09.jpg"; title = "File:Hanscom students participate in Shawsheen River clean up (9108854).jpg" },
  @{ article = "event-recap"; file = "event-01.jpg"; title = "File:FIRST Robotics Competition Palmetto Regional (5558667757).jpg" },
  @{ article = "event-recap"; file = "event-02.jpg"; title = "File:FIRST Robotics Competition Palmetto Regional (5559244070).jpg" },
  @{ article = "event-recap"; file = "event-03.jpg"; title = "File:Miss America Attends FIRST Robotics Championship (1).jpg" },
  @{ article = "event-recap"; file = "event-04.jpg"; title = "File:Miss America Attends FIRST Robotics Championship (2).jpg" },
  @{ article = "event-recap"; file = "event-05.jpg"; title = "File:Miss America Attends FIRST Robotics Championship (3).jpg" },
  @{ article = "event-recap"; file = "event-06.jpg"; title = "File:Miss America Attends FIRST Robotics Championship (4).jpg" },
  @{ article = "event-recap"; file = "event-07.jpg"; title = "File:Miss America Attends FIRST Robotics Championship (5).jpg" },
  @{ article = "event-recap"; file = "event-08.jpg"; title = "File:Miss America Attends FIRST Robotics Championship (7).jpg" },
  @{ article = "event-recap"; file = "event-09.jpg"; title = "File:Miss America Attends FIRST Robotics Championship (10).jpg" }
)

$headers = @{ "User-Agent" = "wechat-ai-publisher-test-fixture/1.0 (local development; licensed-source audit)" }
$root = Join-Path $PSScriptRoot "..\public\real-photo-stress"
New-Item -ItemType Directory -Force -Path $root | Out-Null
$manifest = @()

foreach ($asset in $assets) {
  $title = [uri]::EscapeDataString($asset.title)
  $uri = "https://commons.wikimedia.org/w/api.php?action=query&titles=$title&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=1200&format=json&formatversion=2"
  $data = Invoke-RestMethod -Uri $uri -Headers $headers
  $page = $data.query.pages[0]
  $info = $page.imageinfo[0]
  $metadata = $info.extmetadata
  $destination = Join-Path $root $asset.file
  $fileName = [uri]::EscapeDataString($page.title.Substring(5))
  $downloadUrl = "https://commons.wikimedia.org/w/thumb.php?f=$fileName&width=1200"
  if (-not (Test-Path $destination)) {
    $downloaded = $false
    foreach ($attempt in 1..5) {
      try {
        Invoke-WebRequest -Uri $downloadUrl -Headers @{ "User-Agent" = "Mozilla/5.0" } -OutFile $destination
        $downloaded = $true
        break
      } catch {
        if ($attempt -eq 5) { throw }
        Start-Sleep -Seconds (4 * $attempt)
      }
    }
    if (-not $downloaded) { throw "Could not download $($asset.file)" }
  }
  $manifest += [ordered]@{
    article = $asset.article
    file = $asset.file
    commonsTitle = $page.title
    sourcePage = $info.descriptionurl
    author = $metadata.Artist.value -replace '<[^>]+>', ''
    license = $metadata.LicenseShortName.value
    licenseUrl = $metadata.LicenseUrl.value
    originalWidth = $info.width
    originalHeight = $info.height
    localWidth = $info.thumbwidth
    localHeight = $info.thumbheight
    downloadedFrom = $downloadUrl
  }
  Start-Sleep -Milliseconds 1500
}

$json = ($manifest | ConvertTo-Json -Depth 4) -replace "`r`n", "`n"
[System.IO.File]::WriteAllText((Join-Path $root "LICENSES.generated.json"), $json + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Output "Downloaded $($manifest.Count) licensed real-photo fixtures to $root"
