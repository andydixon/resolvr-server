<?php

$dir = '/tmp/_hosts';

$f = file_put_contents("/tmp/hosts.zip", fopen("https://hosts-file.net/download/hosts.zip", 'r'), LOCK_EX);
if(FALSE === $f)
    die("Couldn't write to file.");
$zip = new ZipArchive;
$res = $zip->open('/tmp/hosts.zip');
if ($res === TRUE) {
  $zip->extractTo($dir);
  $zip->close();
} else {
  die('Extract failed');
}

$data = file($dir.'/hosts.txt');
unlink('blacklist.js');
/**
 * module.exports = { blacklist: [{
 *             domain: "^hello.peteris.*",
 *            records: [{
 *                       type: "A",
 *                       address: "127.0.0.99",
 *                       ttl: 1800
 *                     }]
 *                  }]
 *           }
 **/
$blacklist=fopen("blacklist.js","w");
fputs($blacklist,"module.exports = { blacklist: {\n");
foreach($data as $row) {
        if(strpos($row,'127.0.0.1')===0) {
                $row=explode("\t",$row);
                $hostname=trim($row[1]);
		if (strpos($hostname,'#')===false){
			$record=['type' => 'A', 'address' => '192.0.2.69', 'ttl' => 60*60*24];
			fputs($blacklist, '"' . $hostname . '": [' . json_encode($record) . "],\n");
		}
	}
}
$record=['type'=>'A','address'=>'132.7.80.4','ttl'=>60*60*24];
fputs($blacklist,'"budgie.dxn": ['.json_encode($record)."]};");
echo "Processing complete.\033[K\n";
fclose($blacklist);
