param(
  [string]$Proxy = 'http://127.0.0.1:7897'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$titles = @(
  'Recycling',
  'Pollution',
  'Climate change',
  'Solar energy',
  'Wind power',
  'Renewable energy',
  'Waste',
  'Plastic',
  'Rainforest',
  'Ocean',
  'Internet',
  'Social media',
  'Mobile phone',
  'Artificial intelligence',
  'Robot',
  'Computer',
  'Education',
  'School',
  'University',
  'Teacher',
  'Student',
  'Library',
  'Health',
  'Exercise',
  'Diet',
  'Sleep',
  'Smoking',
  'Vaccine',
  'Hospital',
  'Mental health',
  'Transport',
  'Bicycle',
  'Train',
  'Airplane',
  'Traffic',
  'Car',
  'City',
  'Village',
  'Population',
  'Family',
  'Marriage',
  'Work',
  'Money',
  'Tourism',
  'Sport',
  'Poverty',
  'Crime',
  'Prison',
  'Unemployment',
  'Newspaper',
  'Television'
)

$userAgent = 'IELTS-4.5-readings/1.0 (personal study project)'
$apiBase = 'https://simple.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&titles='
$searchBase = 'https://simple.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch='
$wikiBase = 'https://simple.wikipedia.org/wiki/'
$outputPath = Join-Path $PSScriptRoot 'readings.json'

$script:httpRequestCount = 0

function Invoke-WikiApi([string]$uri) {
  $requestArgs = @{
    Uri = $uri
    Headers = @{ 'User-Agent' = $userAgent }
    TimeoutSec = 30
  }

  if ($Proxy -ne '') {
    $requestArgs['Proxy'] = $Proxy
  }

  $attempt = 0

  while ($true) {
    try {
      $script:httpRequestCount += 1
      $response = Invoke-RestMethod @requestArgs
      Start-Sleep -Milliseconds 300
      return $response
    } catch {
      $status = $null

      if ($null -ne $_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
      }

      if ($status -eq 429 -and $attempt -lt 3) {
        $attempt += 1
        Start-Sleep -Seconds (15 * $attempt)
        continue
      }

      throw
    }
  }
}

function Get-WikiExtract([string]$title) {
  $uri = $apiBase + $title.Replace(' ', '%20')
  $response = Invoke-WikiApi $uri

  if ($null -eq $response.query -or $null -eq $response.query.pages) {
    return $null
  }

  $page = $response.query.pages.PSObject.Properties | Select-Object -First 1

  if ($null -eq $page -or $null -eq $page.Value.extract) {
    return $null
  }

  return [string]$page.Value.extract
}

function Find-WikiTitle([string]$query) {
  $uri = $searchBase + $query.Replace(' ', '%20') + '&srlimit=1'
  $response = Invoke-WikiApi $uri

  if ($null -eq $response.query -or $null -eq $response.query.search) {
    return $null
  }

  $first = $response.query.search | Select-Object -First 1

  if ($null -eq $first -or [string]::IsNullOrWhiteSpace($first.title)) {
    return $null
  }

  return [string]$first.title
}

function Clear-WikiText([string]$text) {
  $lines = $text -split "`r?`n"
  $kept = New-Object System.Collections.Generic.List[string]

  foreach ($line in $lines) {
    $trimmed = $line.Trim()

    if ($trimmed -match '^=+\s*(Related pages|References)\.?\s*=+$' -or
        $trimmed -eq 'Related pages' -or
        $trimmed -eq 'References' -or
        $trimmed -eq 'References.') {
      break
    }

    if ($trimmed -match '^=+\s.*=+\s*$') {
      continue
    }

    if ($trimmed -match '^See the main article\b') {
      continue
    }

    $kept.Add($line)
  }

  $joined = $kept -join "`n"
  $joined = [regex]::Replace($joined, "\n{3,}", "`n`n")

  return $joined.Trim()
}

function ConvertTo-JsonText([string]$value) {
  $builder = New-Object System.Text.StringBuilder
  [void]$builder.Append('"')

  for ($i = 0; $i -lt $value.Length; $i++) {
    $char = $value[$i]
    $code = [int]$char

    if ($char -eq '"') {
      [void]$builder.Append('\"')
    } elseif ($char -eq '\') {
      [void]$builder.Append('\\')
    } elseif ($char -eq "`n") {
      [void]$builder.Append('\n')
    } elseif ($char -eq "`r") {
      [void]$builder.Append('\r')
    } elseif ($char -eq "`t") {
      [void]$builder.Append('\t')
    } elseif ($code -lt 32) {
      [void]$builder.Append(('\u{0:x4}' -f $code))
    } else {
      [void]$builder.Append($char)
    }
  }

  [void]$builder.Append('"')
  return $builder.ToString()
}

$passed = @()
$rejected = @()
$fallbacks = @()

foreach ($title in $titles) {
  $extract = $null
  $requestError = $null

  try {
    $extract = Get-WikiExtract $title
  } catch {
    $requestError = $_.Exception.Message
  }

  $usedTitle = $title
  $fellBack = $false

  if ($null -eq $requestError -and [string]::IsNullOrWhiteSpace($extract)) {
    $foundTitle = $null

    try {
      $foundTitle = Find-WikiTitle $title
    } catch {
      $requestError = $_.Exception.Message
    }

    if ($null -eq $requestError -and $null -ne $foundTitle) {
      try {
        $extract = Get-WikiExtract $foundTitle
        $usedTitle = $foundTitle
        $fellBack = $true
      } catch {
        $requestError = $_.Exception.Message
      }
    }
  }

  if ($null -ne $requestError) {
    $rejected += [pscustomobject]@{ title = $title; reason = '无内容' }
  } elseif ([string]::IsNullOrWhiteSpace($extract)) {
    $rejected += [pscustomobject]@{ title = $title; reason = '无内容' }
  } else {
    $cleaned = Clear-WikiText $extract
    $length = $cleaned.Length

    if ($length -lt 800) {
      $rejected += [pscustomobject]@{ title = $title; reason = '过短（' + $length + ' 字符）' }
    } elseif ($length -gt 8000) {
      $rejected += [pscustomobject]@{ title = $title; reason = '过长（' + $length + ' 字符）' }
    } else {
      $passed += [pscustomobject]@{
        title = $usedTitle
        sourceUrl = $wikiBase + $usedTitle.Replace(' ', '_')
        text = $cleaned
        length = $length
        originalTitle = $title
        fellBack = $fellBack
      }

      if ($fellBack) {
        $fallbacks += ($title + ' → ' + $usedTitle)
      }
    }
  }
}

$jsonLines = New-Object System.Collections.Generic.List[string]
$jsonLines.Add('[')

for ($i = 0; $i -lt $passed.Count; $i++) {
  $entry = $passed[$i]
  $comma = ''

  if ($i -lt $passed.Count - 1) {
    $comma = ','
  }

  $jsonLines.Add('  {')
  $jsonLines.Add('    "no": ' + ($i + 1) + ',')
  $jsonLines.Add('    "title": ' + (ConvertTo-JsonText $entry.title) + ',')
  $jsonLines.Add('    "sourceUrl": ' + (ConvertTo-JsonText $entry.sourceUrl) + ',')
  $jsonLines.Add('    "text": ' + (ConvertTo-JsonText $entry.text))
  $jsonLines.Add('  }' + $comma)
}

$jsonLines.Add(']')

$json = $jsonLines -join "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $json, $utf8NoBom)

$bucketLow = 0
$bucketMid = 0
$bucketHigh = 0

foreach ($entry in $passed) {
  if ($entry.length -lt 2500) {
    $bucketLow += 1
  } elseif ($entry.length -lt 4800) {
    $bucketMid += 1
  } else {
    $bucketHigh += 1
  }
}

Write-Output '==== 抓取报告 ===='
Write-Output ('标题数（请求总数）：' + $titles.Count)
Write-Output ('实际 HTTP 请求：' + $script:httpRequestCount)
Write-Output ('通过：' + $passed.Count)
Write-Output ('被拒：' + $rejected.Count)

if ($rejected.Count -gt 0) {
  Write-Output '被拒条目：'
  foreach ($item in $rejected) {
    Write-Output ('  ' + $item.title + '：' + $item.reason)
  }
} else {
  Write-Output '被拒条目：无'
}

Write-Output '兜底成功：'
if ($fallbacks.Count -gt 0) {
  foreach ($item in $fallbacks) {
    Write-Output ('  ' + $item)
  }
} else {
  Write-Output '  无'
}

Write-Output '通过条目：'
for ($i = 0; $i -lt $passed.Count; $i++) {
  $suffix = ''

  if ($passed[$i].fellBack) {
    $suffix = '；由 ' + $passed[$i].originalTitle + ' 改为 ' + $passed[$i].title
  }

  Write-Output ('  ' + ($i + 1) + '. ' + $passed[$i].title + '（' + $passed[$i].length + ' 字符' + $suffix + '）')
}

Write-Output '长度分布：'
Write-Output ('  800–2499：' + $bucketLow + ' 条')
Write-Output ('  2500–4799：' + $bucketMid + ' 条')
Write-Output ('  4800–8000：' + $bucketHigh + ' 条')

Write-Output ('写入文件：' + $outputPath)
