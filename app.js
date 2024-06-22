const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const rootDirectory = '/mnt/share';

// 提供静态文件
app.use(express.static(rootDirectory));
app.use('/pics', express.static(path.join(__dirname, 'pic')));

// 动态生成文件和文件夹列表
app.get('/files*', (req, res) => {
    const currentPath = path.join(rootDirectory, req.path.replace('/files', ''));
    if (fs.existsSync(currentPath)) {
        const stats = fs.statSync(currentPath);
        if (stats.isFile()) {
            // 如果是文件，检查是否是图像文件
            if (/\.(jpeg|jpg|png|gif)$/i.test(path.basename(currentPath))) {
                // 如果是图像文件，直接发送文件
                return res.sendFile(currentPath);
            }
        }
    }

    // 计算返回上一级目录的链接
    const parentPath = path.dirname(req.path);
    const backLink = parentPath === '/files' ? '/files' : parentPath;

    fs.readdir(currentPath, { withFileTypes: true }, (err, files) => {
        if (err || !files || files.length === 0) {
            // 错误处理或空文件夹
            console.log(11111,files)
            let message = files === true ? "Unable to scan directory: " + err : 'Empty folder';
            return res.send(`
                    <a href="${backLink}">Back</a>
                    <p>${message}</p>
            `);
        }

        files.sort((a, b) => b.isDirectory() - a.isDirectory()); 

        let filelist = '<ul style="display: flex; flex-wrap: wrap;">';
        files.forEach(file => {
            const filePath = path.join(req.path, file.name);
            if (file.isDirectory()) {
                // 是目录
                filelist += `<li><img src="/pics/folder.png" style="width:100px; vertical-align:middle;"> <a href="${filePath}/">${file.name}</a></li>`;
            } else {
                // 是文件
                const fileUrl = path.join('/files', req.path.replace('/files', ''), file.name);
                if (/\.(jpeg|jpg|png|gif)$/i.test(file.name)) {
                    // 图像文件，显示图像预览
                    filelist += `<li><img src="${fileUrl}" style="width:100px; vertical-align:middle;"> <a href="${fileUrl}" target="_blank">${file.name}</a></li>`;
                } else {
                    // 非图像文件，使用通用文件图标
                    filelist += `<li><img src="/pics/file.png" style="width:100px; vertical-align:middle;"> <a href="${fileUrl}" target="_blank">${file.name}</a></li>`;
                }
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
                <style>
                    ul { display: flex; flex-wrap: wrap; list-style-type: none; padding: 0; }
                    li { margin: 10px; }
                </style>
            </head>
            <body>
                <h1>Directory Contents</h1>
                <a href="${backLink}">Back</a>
                ${filelist}
            </body>
            </html>
        `);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
