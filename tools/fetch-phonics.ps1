$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$userAgent = 'IELTS-SPF-phonics-fetch/1.0 (https://github.com/yuyuyu8/IELTS-4.5; personal study project)'
$repoRoot = Split-Path -Parent $PSScriptRoot
$phonicsDir = Join-Path $repoRoot 'audio\phonics'
$mapPath = Join-Path $PSScriptRoot 'phonics-audio.json'
$noticePath = Join-Path $PSScriptRoot 'NOTICE-phonics.md'

if (-not (Test-Path $phonicsDir)) {
  New-Item -ItemType Directory -Path $phonicsDir | Out-Null
}

$candidateText = @'
1|/ɪ/|Near-close near-front unrounded vowel.ogg
2|/e/|Close-mid front unrounded vowel.ogg;Open-mid front unrounded vowel.ogg
3|/æ/|Near-open front unrounded vowel.ogg
4|/ʌ/|Open-mid back unrounded vowel.ogg
5|/ɒ/|Open back rounded vowel.ogg
6|/ʊ/|Near-close near-back rounded vowel.ogg
7|/ə/|Mid central vowel.ogg
8|/iː/|Close front unrounded vowel.ogg
9|/ɑː/|Open back unrounded vowel.ogg
10|/ɔː/|Open-mid back rounded vowel.ogg
11|/uː/|Close back rounded vowel.ogg
12|/ɜː/|Open-mid central unrounded vowel.ogg
13|/eɪ/|
14|/aɪ/|
15|/ɔɪ/|
16|/əʊ/|
17|/aʊ/|
18|/ɪə/|
19|/eə/|
20|/ʊə/|
21|/p/|Voiceless bilabial plosive.ogg
22|/b/|Voiced bilabial plosive.ogg
23|/t/|Voiceless alveolar plosive.ogg
24|/d/|Voiced alveolar plosive.ogg
25|/k/|Voiceless velar plosive.ogg
26|/g/|Voiced velar plosive.ogg
27|/f/|Voiceless labiodental fricative.ogg
28|/v/|Voiced labiodental fricative.ogg
29|/θ/|Voiceless dental fricative.ogg
30|/ð/|Voiced dental fricative.ogg
31|/s/|Voiceless alveolar fricative.ogg
32|/z/|Voiced alveolar fricative.ogg
33|/ʃ/|Voiceless postalveolar fricative.ogg;Voiceless palato-alveolar sibilant.ogg
34|/ʒ/|Voiced postalveolar fricative.ogg;Voiced palato-alveolar sibilant.ogg
35|/h/|Voiceless glottal fricative.ogg
36|/r/|Alveolar approximant.ogg;Voiced alveolar approximant.ogg
37|/tʃ/|Voiceless postalveolar affricate.ogg
38|/dʒ/|Voiced postalveolar affricate.ogg
39|/m/|Bilabial nasal.ogg
40|/n/|Alveolar nasal.ogg
41|/ŋ/|Velar nasal.ogg
42|/l/|Alveolar lateral approximant.ogg;Voiced alveolar lateral approximant.ogg
43|/j/|Palatal approximant.ogg;Voiced palatal approximant.ogg
44|/w/|Labial-velar approximant.ogg;Voiced labial-velar approximant.ogg
'@

$phonemes = @()

foreach ($line in ($candidateText -split "`n")) {
  $trimmed = $line.Trim()
  if ($trimmed -eq '') { continue }

  $parts = $trimmed.Split('|')
  $list = @()

  if ($parts.Length -ge 3 -and $parts[2].Trim() -ne '') {
    foreach ($item in $parts[2].Split(';')) {
      if ($item.Trim() -ne '') { $list += $item.Trim() }
    }
  }

  $phonemes += [pscustomobject]@{
    no = [int]$parts[0]
    symbol = $parts[1]
    candidates = $list
  }
}

Write-Output "音素条目：$($phonemes.Count)"

$titles = @()
foreach ($p in $phonemes) {
  foreach ($c in $p.candidates) {
    $titles += ('File:' + $c)
  }
}

Write-Output "候选标题数：$($titles.Count)"

$infoByTitle = @{}

for ($i = 0; $i -lt $titles.Count; $i += 50) {
  $last = [Math]::Min($i + 49, $titles.Count - 1)
  $batch = $titles[$i..$last]
  $encoded = ($batch | ForEach-Object { [System.Uri]::EscapeDataString($_) }) -join '%7C'
  $apiUrl = "https://commons.wikimedia.org/w/api.php?action=query&titles=$encoded&prop=imageinfo&iiprop=url%7Cextmetadata&format=json"

  $response = Invoke-WebRequest -Uri $apiUrl -UserAgent $userAgent -UseBasicParsing -TimeoutSec 60
  $json = $response.Content | ConvertFrom-Json

  foreach ($pageProp in $json.query.pages.PSObject.Properties) {
    $page = $pageProp.Value
    if ($page.missing -ne $null) { continue }
    if ($page.imageinfo -ne $null -and $page.imageinfo.Count -gt 0) {
      $infoByTitle[$page.title] = $page.imageinfo[0]
    }
  }

  Start-Sleep -Milliseconds 300
}

function Get-LicenseOk([string]$license) {
  if ($license -like 'CC BY-SA*') { return $true }
  if ($license -eq 'CC0') { return $true }
  if ($license -like '*Public domain*') { return $true }
  if ($license -like 'PD*') { return $true }
  return $false
}

function Get-PlainText([string]$value) {
  if ($null -eq $value) { return '' }
  $text = [regex]::Replace($value, '(?is)<[^>]+>', '')
  $text = [System.Net.WebUtility]::HtmlDecode($text)
  return [regex]::Replace($text, '\s+', ' ').Trim()
}

$entries = @()
$noRecording = @()
$failures = @()

foreach ($p in $phonemes) {
  $chosenTitle = $null
  $chosenInfo = $null
  $skipped = @()

  foreach ($c in $p.candidates) {
    $title = 'File:' + $c

    if (-not $infoByTitle.ContainsKey($title)) { continue }

    $info = $infoByTitle[$title]
    $license = ''

    if ($info.extmetadata -ne $null -and $info.extmetadata.LicenseShortName -ne $null) {
      $license = Get-PlainText $info.extmetadata.LicenseShortName.value
    }

    if (-not (Get-LicenseOk $license)) {
      $skipped += ($c + '（授权：' + $license + '）')
      continue
    }

    $chosenTitle = $title
    $chosenInfo = $info
    break
  }

  if ($skipped.Count -gt 0) {
    Write-Output ("跳过非 CC BY-SA / 公有领域候选（no=" + $p.no + " " + $p.symbol + "）：" + ($skipped -join '；'))
  }

  if ($null -eq $chosenInfo) {
    $noRecording += $p.symbol
    $entries += [pscustomobject]@{
      no = $p.no
      symbol = $p.symbol
      file = $null
      commonsTitle = $null
      license = ''
      author = ''
    }
    Write-Output ("无录音：no=" + $p.no + " " + $p.symbol)
    continue
  }

  $originalUrl = $chosenInfo.url
  $queryIndex = $originalUrl.IndexOf('?')
  if ($queryIndex -ge 0) { $originalUrl = $originalUrl.Substring(0, $queryIndex) }

  $fileName = $originalUrl.Substring($originalUrl.LastIndexOf('/') + 1)
  $transcodedUrl = $originalUrl.Replace('/commons/', '/commons/transcoded/') + '/' + $fileName + '.mp3'

  $license = ''
  if ($chosenInfo.extmetadata -ne $null -and $chosenInfo.extmetadata.LicenseShortName -ne $null) {
    $license = Get-PlainText $chosenInfo.extmetadata.LicenseShortName.value
  }

  $author = ''
  if ($chosenInfo.extmetadata -ne $null -and $chosenInfo.extmetadata.Artist -ne $null) {
    $author = Get-PlainText $chosenInfo.extmetadata.Artist.value
  }

  $targetName = $p.no.ToString('000') + '.mp3'
  $targetPath = Join-Path $phonicsDir $targetName

  $downloaded = $false

  if (Test-Path $targetPath) {
    $existingSize = (Get-Item $targetPath).Length
    if ($existingSize -ge 2000) {
      Write-Output ("已存在，跳过下载：" + $targetName + "（" + $existingSize + " 字节）")
      $downloaded = $true
    } else {
      Remove-Item $targetPath -Force
    }
  }

  if (-not $downloaded) {
    Write-Output ("下载 no=" + $p.no + " " + $p.symbol + " -> " + $targetName)
  }

  $attempt = 0

  while (-not $downloaded -and $attempt -lt 4) {
    $attempt += 1

    try {
      Invoke-WebRequest -Uri $transcodedUrl -UserAgent $userAgent -OutFile $targetPath -UseBasicParsing -TimeoutSec 120
      $downloaded = $true
    } catch {
      $message = $_.Exception.Message
      Write-Output ("  第 " + $attempt + " 次尝试失败：" + $message)

      if (Test-Path $targetPath) { Remove-Item $targetPath -Force }

      if ($attempt -lt 4) {
        Start-Sleep -Seconds (5 * $attempt)
      } else {
        $failures += [pscustomobject]@{ no = $p.no; symbol = $p.symbol; reason = $message }
        $entries += [pscustomobject]@{
          no = $p.no
          symbol = $p.symbol
          file = $null
          commonsTitle = $null
          license = ''
          author = ''
        }
        Write-Output ("下载失败：no=" + $p.no + " " + $p.symbol + " 原因：" + $message)
      }
    }
  }

  Start-Sleep -Milliseconds 300

  if (-not $downloaded) { continue }

  $size = (Get-Item $targetPath).Length

  if ($size -lt 2000) {
    Remove-Item $targetPath -Force
    $failures += [pscustomobject]@{ no = $p.no; symbol = $p.symbol; reason = ('文件过小：' + $size + ' 字节') }
    $entries += [pscustomobject]@{
      no = $p.no
      symbol = $p.symbol
      file = $null
      commonsTitle = $null
      license = ''
      author = ''
    }
    Write-Output ("失败：no=" + $p.no + " " + $p.symbol + " 文件过小（" + $size + " 字节）")
    continue
  }

  $entries += [pscustomobject]@{
    no = $p.no
    symbol = $p.symbol
    file = ('audio/phonics/' + $targetName)
    commonsTitle = $chosenTitle
    license = $license
    author = $author
  }
}

$jsonText = ConvertTo-Json -InputObject $entries -Depth 5
[System.IO.File]::WriteAllText($mapPath, $jsonText + "`n", (New-Object System.Text.UTF8Encoding($false)))

$noticeLines = @()
$noticeLines += '# 音素录音授权说明'
$noticeLines += ''
$noticeLines += '以下音素录音来自维基共享资源（Wikimedia Commons）。'
$noticeLines += ''

foreach ($entry in $entries) {
  if ($null -eq $entry.commonsTitle) { continue }

  $pageUrl = 'https://commons.wikimedia.org/wiki/' + [System.Uri]::EscapeDataString($entry.commonsTitle.Replace(' ', '_'))
  $licenseUrl = 'https://creativecommons.org/licenses/by-sa/3.0/'

  $noticeLines += ('## ' + $entry.symbol + '（' + $entry.no + '）')
  $noticeLines += ''
  $noticeLines += ('- 文件页：' + $pageUrl)
  $noticeLines += ('- 作者：' + $entry.author)
  $noticeLines += ('- 授权：' + $entry.license)
  $noticeLines += ('- 授权地址：' + $licenseUrl)
  $noticeLines += ''
}

$noticeLines += '## 声明'
$noticeLines += ''
$noticeLines += '这些文件来自维基共享资源，以 CC BY-SA 3.0 授权。再次分发需保留署名，并以相同方式共享。'
$noticeLines += ''

[System.IO.File]::WriteAllText($noticePath, ($noticeLines -join "`n"), (New-Object System.Text.UTF8Encoding($false)))

$withAudio = @($entries | Where-Object { $null -ne $_.file }).Count
$withoutAudio = @($entries | Where-Object { $null -eq $_.file }).Count

Write-Output ''
Write-Output '==== 统计 ===='
Write-Output "音素总数：$($entries.Count)"
Write-Output "有录音：$withAudio 条"
Write-Output "无录音：$withoutAudio 条"
if ($withoutAudio -gt 0) {
  $symbols = @($entries | Where-Object { $null -eq $_.file } | ForEach-Object { $_.symbol })
  Write-Output ('无录音的符号：' + ($symbols -join ' '))
}
if ($failures.Count -gt 0) {
  Write-Output '下载失败：'
  foreach ($f in $failures) {
    Write-Output ('  no=' + $f.no + ' ' + $f.symbol + ' 原因：' + $f.reason)
  }
} else {
  Write-Output '下载失败：无'
}
Write-Output "映射文件：$mapPath"
Write-Output "授权说明：$noticePath"
