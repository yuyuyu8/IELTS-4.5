param(
  [string]$Proxy = 'http://127.0.0.1:7897'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$titles = @(
  'Climate change',
  'Global warming',
  'Recycling',
  'Pollution',
  'Solar energy',
  'Wind power',
  'Water',
  'Electricity',
  'Internet',
  'Social media',
  'Mobile phone',
  'Computer',
  'Artificial intelligence',
  'Robot',
  'Education',
  'School',
  'University',
  'Teacher',
  'Student',
  'Health',
  'Exercise',
  'Diet',
  'Sleep',
  'Smoking',
  'Vaccine',
  'Hospital',
  'Transport',
  'Bicycle',
  'Train',
  'Airplane',
  'Traffic',
  'City',
  'Village',
  'Population',
  'Family',
  'Marriage',
  'Work',
  'Money',
  'Tourism',
  'Sport'
)

$userAgent = 'IELTS-4.5-readings/1.0 (personal study project)'
$apiBase = 'https://simple.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&titles='
$wikiBase = 'https://simple.wikipedia.org/wiki/'
$outputPath = Join-Path $PSScriptRoot 'readings.json'

function Get-WikiExtract([string]$title) {
  $uri = $apiBase + $title.Replace(' ', '%20')
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
      $response = Invoke-RestMethod @requestArgs
      break
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

  $page = $response.query.pages.PSObject.Properties | Select-Object -First 1

  if ($null -eq $page) {
    return $null
  }

  $extract = $page.Value.extract

  if ($null -eq $extract) {
    return $null
  }

  return [string]$extract
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
$requestCount = 0

foreach ($title in $titles) {
  $requestCount += 1
  $extract = $null
  $requestError = $null

  try {
    $extract = Get-WikiExtract $title
  } catch {
    $requestError = $_.Exception.Message
  }

  if ($null -eq $requestError -and [string]::IsNullOrWhiteSpace($extract)) {
    $rejected += [pscustomobject]@{ title = $title; reason = '无内容' }
  } elseif ($null -ne $requestError) {
    $rejected += [pscustomobject]@{ title = $title; reason = '无内容（请求失败：' + $requestError + '）' }
  } else {
    $cleaned = Clear-WikiText $extract
    $length = $cleaned.Length

    if ($length -lt 800) {
      $rejected += [pscustomobject]@{ title = $title; reason = '过短（' + $length + ' 字符）' }
    } elseif ($length -gt 3000) {
      $rejected += [pscustomobject]@{ title = $title; reason = '过长（' + $length + ' 字符）' }
    } else {
      $passed += [pscustomobject]@{
        title = $title
        sourceUrl = $wikiBase + $title.Replace(' ', '_')
        text = $cleaned
        length = $length
      }
    }
  }

  Start-Sleep -Milliseconds 300
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

Write-Output '==== 抓取报告 ===='
Write-Output ('请求总数：' + $requestCount)
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

Write-Output '通过条目：'
for ($i = 0; $i -lt $passed.Count; $i++) {
  Write-Output ('  ' + ($i + 1) + '. ' + $passed[$i].title + '（' + $passed[$i].length + ' 字符）')
}

Write-Output ('写入文件：' + $outputPath)
