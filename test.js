// read sync json file

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'sync.json');

const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const res = {}
for (elType of Object.keys(file)) {
    res[elType] = {}
    for (el of file[elType]) {
        delete el.id
        res[elType][el.key] = el
    }
}

fs.writeFileSync('sync_o.json', JSON.stringify(res, null, 2));
