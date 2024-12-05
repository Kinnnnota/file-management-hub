const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const rootDirectory = path.join(__dirname, 'images');

// 中间件配置
app.use(express.json());
app.use(express.static(rootDirectory));
app.use('/pics', express.static(path.join(__dirname, 'pics')));

// 处理文件删除请求
app.post('/delete-files', (req, res) => {
    const files = req.body.files || [];
    const results = [];

    files.forEach(filePath => {
        const fullPath = path.join(rootDirectory, filePath.replace('/files', ''));
        try {
            fs.unlinkSync(fullPath);
            results.push({ file: filePath, success: true });
        } catch (err) {
            results.push({ file: filePath, success: false, error: err.message });
        }
    });

    res.json(results);
});

// 文件浏览器主路由
app.get('/files*', (req, res) => {
    const currentPath = path.join(rootDirectory, req.path.replace('/files', ''));
    
    // 检查路径是否存在
    if (fs.existsSync(currentPath)) {
        const stats = fs.statSync(currentPath);
        // 处理单个图片文件的直接访问
        if (stats.isFile() && /\.(jpeg|jpg|png|gif)$/i.test(path.basename(currentPath))) {
            return res.sendFile(currentPath);
        }
    }

    // 计算返回上级目录的链接
    const parentPath = path.dirname(req.path);
    const backLink = parentPath === '/files' ? '/files' : parentPath;

    // 读取目录内容
    fs.readdir(currentPath, { withFileTypes: true }, (err, files) => {
        if (err || !files || files.length === 0) {
            const message = files === true ? "Unable to scan directory: " + err : 'Empty folder';
            return res.send(`
                    <a href="${backLink}">Back</a>
                    <p>${message}</p>
            `);
        }

        // 目录在前，文件在后
        files.sort((a, b) => b.isDirectory() - a.isDirectory());

        // 生成文件列表HTML
        let filelist = `
            <div style="margin-bottom: 20px;">
                <button onclick="toggleSelectMode()" id="selectModeBtn">Enable Select Mode</button>
                <button onclick="downloadSelected()" id="downloadBtn" style="display:none;">Download Selected</button>
                <button onclick="deleteSelected()" id="deleteBtn" style="display:none;" class="delete-btn">Delete Selected</button>
            </div>
            <ul style="display: flex; flex-wrap: wrap;">`;
            
        // 遍历并显示所有文件和文件夹
        files.forEach(file => {
            const filePath = path.join(req.path, file.name);
            const fileUrl = path.join('/files', req.path.replace('/files', ''), file.name);
            
            // 添加调试日志
            console.log({
                fileName: file.name,
                filePath: filePath,
                fileUrl: fileUrl,
                reqPath: req.path,
                isDirectory: file.isDirectory()
            });
            
            if (file.isDirectory()) {
                // 渲染文件夹，使用相对路径访问 folder.png
                console.log(filePath);
                filelist += `<li>
                    <a href="${filePath}/">
                        <img src="/pics/folder.jpg" style="width:100px; vertical-align:middle;">
                        <span>${file.name}</span>
                    </a>
                </li>`;
            } else {
                // 渲染文件（区分图片和普通文件）
                if (/\.(jpeg|jpg|png|gif)$/i.test(file.name)) {
                    filelist += `
                        <li>
                            <input type="checkbox" class="file-checkbox" style="display:none;" data-file="${fileUrl}">
                            <a href="${fileUrl}" target="_blank">
                                <img src="${fileUrl}" style="width:100px; height:100px; object-fit:cover;">
                                <span>${file.name}</span>
                            </a>
                        </li>`;
                } else {
                    filelist += `<li>
                        <a href="${fileUrl}" target="_blank">
                            <img src="/pics/file.png" style="width:100px; vertical-align:middle;">
                            <span>${file.name}</span>
                        </a>
                    </li>`;
                }
            }
        });
        filelist += '</ul>';

        // 返回完整的HTML页面
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>File Browser</title>
                <style>
                    ul { display: flex; flex-wrap: wrap; list-style-type: none; padding: 0; }
                    li { 
                        margin: 10px; 
                        position: relative;
                        width: 150px;
                        text-align: center;
                    }
                    .file-checkbox { position: absolute; top: 5px; left: 5px; }
                    .selected img { border: 3px solid #007bff; }
                    .delete-btn { background-color: #dc3545; color: white; border: none; padding: 5px 10px; cursor: pointer; }
                    .delete-btn:hover { background-color: #c82333; }
                    img {
                        width: 100px;
                        height: 100px;
                        object-fit: cover;
                        vertical-align: middle;
                    }
                    a {
                        display: block;
                        margin-top: 5px;
                        word-break: break-all;
                    }
                    li a {
                        text-decoration: none;
                        color: inherit;
                    }
                    li span {
                        display: block;
                        margin-top: 5px;
                        word-break: break-all;
                    }
                </style>
                <script>
                    // 切换选择模式
                    function toggleSelectMode() {
                        const checkboxes = document.querySelectorAll('.file-checkbox');
                        const selectModeBtn = document.getElementById('selectModeBtn');
                        const downloadBtn = document.getElementById('downloadBtn');
                        const deleteBtn = document.getElementById('deleteBtn');
                        
                        checkboxes.forEach(cb => {
                            cb.style.display = cb.style.display === 'none' ? 'block' : 'none';
                        });
                        
                        selectModeBtn.textContent = selectModeBtn.textContent === 'Enable Select Mode' 
                            ? 'Disable Select Mode' 
                            : 'Enable Select Mode';
                            
                        downloadBtn.style.display = downloadBtn.style.display === 'none' 
                            ? 'inline-block' 
                            : 'none';
                        deleteBtn.style.display = deleteBtn.style.display === 'none' 
                            ? 'inline-block' 
                            : 'none';
                    }

                    // 下载选中的文件
                    function downloadSelected() {
                        const selectedFiles = Array.from(document.querySelectorAll('.file-checkbox:checked'))
                            .map(cb => cb.dataset.file);
                            
                        if (selectedFiles.length === 0) {
                            alert('Please select at least one file');
                            return;
                        }

                        selectedFiles.forEach(fileUrl => {
                            const link = document.createElement('a');
                            link.href = fileUrl;
                            const originalName = fileUrl.split('/').pop();
                            link.download = originalName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        });
                    }

                    // 删除选中的文件
                    async function deleteSelected() {
                        const selectedFiles = Array.from(document.querySelectorAll('.file-checkbox:checked'))
                            .map(cb => cb.dataset.file);
                            
                        if (selectedFiles.length === 0) {
                            alert('Please select at least one file');
                            return;
                        }

                        if (!confirm('Are you sure you want to delete the selected files?')) {
                            return;
                        }

                        try {
                            const response = await fetch('/delete-files', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ files: selectedFiles })
                            });

                            const results = await response.json();
                            const successCount = results.filter(r => r.success).length;
                            const failCount = results.length - successCount;
                            
                            alert(
                                'Deleted ' + successCount + ' files successfully.' + 
                                (failCount > 0 ? ' Failed to delete ' + failCount + ' files.' : '')
                            );
                            
                            window.location.reload();
                        } catch (error) {
                            alert('Error deleting files: ' + error.message);
                        }
                    }

                    // 处理复选框状态变化
                    document.addEventListener('change', (e) => {
                        if (e.target.classList.contains('file-checkbox')) {
                            e.target.closest('li').classList.toggle('selected', e.target.checked);
                        }
                    });
                </script>
            </head>
            <body>
                <h1>File Browser</h1>
                <a href="${backLink}">Back</a>
                ${filelist}
            </body>
            </html>
        `);
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`File browser is running at http://localhost:${PORT}/files`);
});
