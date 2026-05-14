const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf-8');

// Fix mangled Normalizuj
content = content.replace(/Normalizuj glasno[^<]+/, '{t("dl_normalize")}');

// Fix ZAUSTAVI / PREUZMI
content = content.replace(/<StopCircle[^>]+>\s*ZAUSTAVI/g, '<StopCircle size={20} /> {t("dl_btn_stop")}');
content = content.replace(/<Download size=\{20\}\s*\/>\s*PREUZMI/g, '<Download size={20} /> {t("dl_btn_download")}');

// Fix Randomize Tab method strings
content = content.replace(/id: 'Abecedno', icon: <List size=\{18\} \/>, label: 'Abecedno'/g, 'id: \'Abecedno\', icon: <List size={18} />, label: t("org_method_alpha")');
content = content.replace(/id: 'Po izvo[^']+', icon: <Music size=\{18\} \/>, label: 'Po izvo[^']+'/g, 'id: \'Po izvodjacu\', icon: <Music size={18} />, label: t("org_method_artist")');
content = content.replace(/id: 'Po izvođaču', icon: <Music size=\{18\} \/>, label: 'Po izvođaču'/g, 'id: \'Po izvodjacu\', icon: <Music size={18} />, label: t("org_method_artist")');
content = content.replace(/id: 'Nasumi[^']+', icon: <Shuffle size=\{18\} \/>, label: 'Nasumi[^']+'/g, 'id: \'Nasumicno\', icon: <Shuffle size={18} />, label: t("org_method_random")');
content = content.replace(/id: 'Nasumično', icon: <Shuffle size=\{18\} \/>, label: 'Nasumično'/g, 'id: \'Nasumicno\', icon: <Shuffle size={18} />, label: t("org_method_random")');

// The if condition
content = content.replace(/currentMethod === 'Po izvo[^']+'/g, 'currentMethod === \'Po izvodjacu\'');
content = content.replace(/currentMethod === 'Po izvođaču'/g, 'currentMethod === \'Po izvodjacu\'');
content = content.replace(/currentMethod === 'Nasumi[^']+'/g, 'currentMethod === \'Nasumicno\'');
content = content.replace(/currentMethod === 'Nasumično'/g, 'currentMethod === \'Nasumicno\'');

// Fix Klikni opet
content = content.replace(/>\s*Klikni opet\s*</g, '>{t("org_click_again")}<');

// Fix Nema ucitanih fajlova
content = content.replace(/Nema u[^i]+itanih fajlova/g, '{t("org_no_files")}');
content = content.replace(/Nema učitanih fajlova/g, '{t("org_no_files")}');

// Fix USB Tab Spremno
content = content.replace(/Spremno: \{sourceFiles\.length\} fajlova za prebacivanje \(Zahtijeva \{formatBytes\(totalSize\)\} prostora\)\./g, '{t("usb_ready_files").replace("{count}", sourceFiles.length).replace("{size}", formatBytes(totalSize))}');

// Fix usb_free_space interpolation
content = content.replace(/\{t\("usb_free_space"\)\}/g, '${t("usb_free_space")}');

fs.writeFileSync('src/App.jsx', content, 'utf-8');
console.log('Fixed translations via Node!');
