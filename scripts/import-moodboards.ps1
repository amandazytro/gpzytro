param([string]$Workbook = 'referencias/MOODBOARD 2/moodboards_all_1.xlsx')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$book = [IO.Compression.ZipFile]::OpenRead((Join-Path $root $Workbook))
function Read-Xml([string]$name) {
  $entry=$book.GetEntry($name)
  if(!$entry){throw "Missing workbook part: $name"}
  $reader=[IO.StreamReader]::new($entry.Open())
  try { return [xml]$reader.ReadToEnd() } finally {$reader.Dispose()}
}
function Get-Images([int]$drawing) {
  $xml=Read-Xml "xl/drawings/drawing$drawing.xml"
  $rels=Read-Xml "xl/drawings/_rels/drawing$drawing.xml.rels"
  $result=@{}
  foreach($anchor in $xml.DocumentElement.ChildNodes){
    $row=[int]$anchor.SelectSingleNode('./*[local-name()="from"]/*[local-name()="row"]').InnerText+1
    $blip=$anchor.SelectSingleNode('.//*[local-name()="blip"]')
    $id=$blip.GetAttribute('embed','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $rel=$rels.DocumentElement.ChildNodes | Where-Object {$_.Id -eq $id}
    $target=$rel.Target.TrimStart('/')
    if($target.StartsWith('../')){$target='xl/'+$target.Substring(3)}
    $result[$row]=$target
  }
  return $result
}
function Copy-Image([string]$source,[string]$target){
  $entry=$book.GetEntry($source);if(!$entry){throw "Missing image: $source"}
  $inputStream=$entry.Open();$outputStream=[IO.File]::Create($target)
  try{$inputStream.CopyTo($outputStream)}finally{$inputStream.Dispose();$outputStream.Dispose()}
}
try{
  $overview=Get-Images 1
  $boards=[ordered]@{}
  $names=@('Walnut & Cream','Coral & Onyx','Grey & Marble')
  foreach($number in 1..3){
    $sheetIndex=$number+1
    $sheet=Read-Xml "xl/worksheets/sheet$sheetIndex.xml"
    $images=Get-Images $sheetIndex
    $folder="catalog/moodboard-$number-2026"
    $destination=Join-Path $root "public/$folder"
    [IO.Directory]::CreateDirectory($destination) | Out-Null
    Copy-Image $overview[$number+5] (Join-Path $destination 'overview.png')
    $products=@()
    foreach($row in $sheet.worksheet.sheetData.row){
      if([int]$row.r -lt 7){continue}
      $cells=@{}
      foreach($cell in $row.c){$cells[($cell.r -replace '\d','')]=$cell.InnerText}
      if(!$cells['B']){continue}
      $id=$cells['B'];$image=$images[[int]$row.r]
      if(!$image){throw "Missing image for board $number row $($row.r)"}
      Copy-Image $image (Join-Path $destination "$id.png")
      $products+= [ordered]@{
        id=$id;name=$cells['C'];category=$cells['D'];location=$cells['E'];appearance=$cells['F'];colour=$cells['G'];finish=$cells['H'];supplier=$cells['I'];notes=$cells['J'];
        description="Location: $($cells['E']). Appearance: $($cells['F']). Colour: $($cells['G']). Finish: $($cells['H']). Supplier: $($cells['I']). Notes: $($cells['J']). Descriptive reference, not a verified manufacturer product. Apply only to an existing compatible element at the indicated location; incidental objects in the crop do not expand the specification.";
        image="/$folder/$id.png";approved=$true;sourceRow=[int]$row.r
      }
    }
    $boards["$number"]=[ordered]@{
      status='ready';name=$names[$number-1];previewImage="/$folder/overview.png";sourceWorkbook=$Workbook;sourceSheet=([string][char](64+$number))+' - '+$names[$number-1];allowCompatibleFallback=$true;products=$products;
      rules=@('Use only this moodboard references. IDs are scoped to the selected moodboard; never borrow an item from another board.','Match the specified appearance, colour and finish exactly for each applicable item. Supplier names are unconfirmed; do not claim a verified branded product.','Preserve the supplied floorplan, room geometry, furniture functions, count, placement, orientation and essential equipment. Camera changes requested by the user are allowed without floorplan markers; preserve the camera otherwise. Reference ceilings, doors, niches and partitions specify finishes only: never create or reshape architecture.','Use the location column: booth furniture belongs to workspace booths, reception desks to reception, dining chairs to meeting/dining. Never replace a lounge sofa with a booth.','For an existing item without a compatible product reference, design only its form using applicable finishes from this moodboard; invent finishes only if no applicable reference exists.','Overview render is a style reference only and never replaces the mandatory architectural plan or the original room furniture layout.','RG-01 in Moodboard C is a hard hexagon tile floor inlay, not a textile rug. Do not misrepresent its material. Preserve floor geometry and existing furniture placement.')
    }
    Write-Output "Moodboard $number - $($names[$number-1]): $($products.Count) rows and images"
  }
  $json=@{moodboards=$boards}|ConvertTo-Json -Depth 12
  [IO.File]::WriteAllText((Join-Path $root 'src/config/astra-catalog.json'),$json,[Text.UTF8Encoding]::new($false))
}finally{$book.Dispose()}
