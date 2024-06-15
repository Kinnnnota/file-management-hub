const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const rootDirectory = path.join(__dirname, 'public'); // 根目录

// 提供静态文件
app.use(express.static('public'));

// 动态生成文件和文件夹列表
app.get('/files*', (req, res) => {
    const currentPath = path.join(rootDirectory, req.path.replace('/files', ''));
    fs.readdir(currentPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            return res.status(500).send("Unable to scan directory: " + err);
        }
        let filelist = '<ul>';
        files.forEach(file => {
            if (file.isDirectory()) {
                filelist += `<li>[Dir] <a href="${path.join(req.path, file.name)}">${file.name}</a></li>`;
            } else {
                filelist += `<li>[File] ${file.name}</li>`;
            }
        });
        filelist += '</ul>';
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Directory Contents</title>
            </head>
            <body>
                <h1>Directory Contents</h1>
                ${filelist}
            </body>
            </html>
        `);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
