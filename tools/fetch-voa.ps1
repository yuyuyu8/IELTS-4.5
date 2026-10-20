$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
$indexUrl = 'https://learningenglish.voanews.com/p/5644.html'
$baseUrl = 'https://learningenglish.voanews.com'
$mp3Pattern = 'https?://[^"' + "'" + '\s\\]+\.mp3'

$repoRoot = Split-Path -Parent $PSScriptRoot
$audioDir = Join-Path $repoRoot 'audio'
$lessonsPath = Join-Path $PSScriptRoot 'lessons.json'

if (-not (Test-Path $audioDir)) {
  New-Item -ItemType Directory -Path $audioDir | Out-Null
}

function Get-Mp3Urls([string]$html) {
  $matches = [regex]::Matches($html, $mp3Pattern)
  $urls = @()
  foreach ($m in $matches) {
    $url = $m.Value
    if ($url.Contains('&')) { continue }
    if ($urls -notcontains $url) { $urls += $url }
  }
  return $urls
}

function Get-Title([string]$html) {
  $metaTag = [regex]::Match($html, '(?is)<meta[^>]*property\s*=\s*["' + "'" + ']og:title["' + "'" + '][^>]*>').Value
  if ($metaTag.Length -gt 0) {
    $contentMatch = [regex]::Match($metaTag, '(?is)content\s*=\s*["' + "'" + ']([^"' + "'" + ']*)["' + "'" + ']')
    if ($contentMatch.Success) {
      $title = [System.Net.WebUtility]::HtmlDecode($contentMatch.Groups[1].Value)
      $title = [regex]::Replace($title, '\s+', ' ').Trim()
      if ($title.Length -gt 0) { return $title }
    }
  }

  $titleMatch = [regex]::Match($html, '(?is)<title>(.*?)</title>')
  if ($titleMatch.Success) {
    $title = [System.Net.WebUtility]::HtmlDecode($titleMatch.Groups[1].Value)
    $title = [regex]::Replace($title, '\s+', ' ').Trim()
    if ($title.Length -gt 0) { return $title }
  }

  return $null
}

function Get-Transcript([string]$html) {
  $paragraphs = [regex]::Matches($html, '(?is)<p\b[^>]*>(.*?)</p>')
  $texts = @()

  foreach ($p in $paragraphs) {
    $text = [regex]::Replace($p.Groups[1].Value, '(?is)<[^>]+>', ' ')
    $text = [System.Net.WebUtility]::HtmlDecode($text)
    $text = [regex]::Replace($text, '\s+', ' ').Trim()
    if ($text.Length -gt 0) { $texts += $text }
  }

  $joined = ($texts -join "`n")
  if ($joined.Length -lt 200) { return $null }
  return $joined
}

Write-Output "抓取索引页：$indexUrl"
$indexHtml = (Invoke-WebRequest -Uri $indexUrl -UserAgent $userAgent -UseBasicParsing -TimeoutSec 60).Content

$linkMatches = [regex]::Matches($indexHtml, 'href="([^"]*lets-learn-english-lesson[^"]*/\d+\.html)"')
$links = @()

foreach ($m in $linkMatches) {
  $href = $m.Groups[1].Value
  if ($href.StartsWith('/')) {
    $full = $baseUrl + $href
  } elseif ($href -match '^https?://') {
    $full = $href
  } else {
    $full = $baseUrl + '/' + $href
  }
  if ($links -notcontains $full) { $links += $full }
}

Write-Output "课程链接数：$($links.Count)"

if ($links.Count -lt 40) {
  Write-Output "自检一失败：链接数少于 40，实际为 $($links.Count)"
  $links | Select-Object -First 10 | ForEach-Object { Write-Output "  $_" }
  exit 1
}

if ($links.Count -gt 60) {
  Write-Output "自检二失败：链接数多于 60，实际为 $($links.Count)"
  $links | Select-Object -First 10 | ForEach-Object { Write-Output "  $_" }
  exit 1
}

$lessons = @()
$nullNoCount = 0
$seq = 0

foreach ($link in $links) {
  $seq += 1
  Write-Output "抓取课程页（$seq / $($links.Count)）：$link"
  $html = (Invoke-WebRequest -Uri $link -UserAgent $userAgent -UseBasicParsing -TimeoutSec 60).Content

  $mp3Urls = @(Get-Mp3Urls $html)

  if ($mp3Urls.Count -eq 0) {
    Write-Output "自检三失败：找不到 MP3 地址"
    Write-Output "页面：$link"
    Write-Output "页面前 2000 个字符："
    Write-Output $html.Substring(0, [Math]::Min(2000, $html.Length))
    exit 1
  }

  $noMatch = [regex]::Match($link, 'lesson-(\d+)')
  $no = $null
  if ($noMatch.Success) {
    $no = [int]$noMatch.Groups[1].Value
  } else {
    $nullNoCount += 1
  }

  $lessons += [pscustomobject]@{
    no = $no
    title = (Get-Title $html)
    pageUrl = $link
    mp3Url = $mp3Urls[0]
    transcript = (Get-Transcript $html)
    audioFile = $null
  }
}

$usedNames = @{}
$downloadedCount = 0
$totalBytes = 0

for ($i = 0; $i -lt $lessons.Count; $i++) {
  $lesson = $lessons[$i]

  if ($null -ne $lesson.no) {
    $name = $lesson.no.ToString('000')
  } else {
    $name = ($i + 1).ToString('000')
    Write-Output "编号为 null 的课程按顺序编号：$name（$($lesson.pageUrl)）"
  }

  $lesson.audioFile = 'audio/' + $name + '.mp3'
}

for ($i = 0; $i -lt $lessons.Count; $i++) {
  $lesson = $lessons[$i]
  $target = Join-Path $repoRoot ($lesson.audioFile -replace '/', '\')

  Write-Output "下载（$($i + 1) / $($lessons.Count)）：$($lesson.audioFile) <- $($lesson.mp3Url)"
  Invoke-WebRequest -Uri $lesson.mp3Url -UserAgent $userAgent -OutFile $target -UseBasicParsing -TimeoutSec 300

  $size = (Get-Item $target).Length
  Write-Output "  字节数：$size"

  if ($size -lt 100000) {
    Write-Output "自检失败：文件小于 100000 字节"
    Write-Output "课程页：$($lesson.pageUrl)"
    Write-Output "音频地址：$($lesson.mp3Url)"
    Write-Output "字节数：$size"
    Write-Output "可能是地址不对或需要重定向"
    exit 1
  }

  $downloadedCount += 1
  $totalBytes += $size

  if ($i -eq 1) {
    Write-Output "试跑两课通过，继续下载其余课程。"
  }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("[`n")

for ($i = 0; $i -lt $lessons.Count; $i++) {
  $lesson = $lessons[$i]

  $noText = if ($null -eq $lesson.no) { 'null' } else { [string]$lesson.no }
  $titleText = if ($null -eq $lesson.title) { 'null' } else { ConvertTo-Json -InputObject $lesson.title -Compress }
  $pageText = ConvertTo-Json -InputObject $lesson.pageUrl -Compress
  $audioText = ConvertTo-Json -InputObject $lesson.audioFile -Compress
  $transcriptText = if ($null -eq $lesson.transcript) { 'null' } else { ConvertTo-Json -InputObject $lesson.transcript -Compress }

  [void]$sb.Append("  {`n")
  [void]$sb.Append("    `"no`": $noText,`n")
  [void]$sb.Append("    `"title`": $titleText,`n")
  [void]$sb.Append("    `"pageUrl`": $pageText,`n")
  [void]$sb.Append("    `"audioFile`": $audioText,`n")
  [void]$sb.Append("    `"transcript`": $transcriptText`n")
  [void]$sb.Append("  }")
  if ($i -lt $lessons.Count - 1) { [void]$sb.Append(',') }
  [void]$sb.Append("`n")
}

[void]$sb.Append("]`n")

[System.IO.File]::WriteAllText($lessonsPath, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))

$transcriptOk = 0
$transcriptFail = 0
foreach ($lesson in $lessons) {
  if ($null -eq $lesson.transcript) { $transcriptFail += 1 } else { $transcriptOk += 1 }
}

Write-Output ''
Write-Output '==== 统计 ===='
Write-Output "课程总数：$($lessons.Count)"
Write-Output "下载成功：$downloadedCount 个，总字节数：$totalBytes"
Write-Output "文字稿成功：$transcriptOk 条，失败：$transcriptFail 条"
Write-Output "编号为 null 的条数：$nullNoCount"
Write-Output "清单文件：$lessonsPath"
