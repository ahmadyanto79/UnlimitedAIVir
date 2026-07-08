let currentLicense = localStorage.getItem('ai_premium_license');

// Cek lisensi saat load
if (currentLicense) {
    checkLicense(currentLicense);
}

async function verifyLicense() {
    const input = document.getElementById('licenseInput').value.trim();
    if (!input) return;
    await checkLicense(input);
}

async function checkLicense(licenseKey) {
    try {
        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license: licenseKey })
        });
        const data = await res.json();
        
        if (data.valid) {
            localStorage.setItem('ai_premium_license', licenseKey);
            currentLicense = licenseKey;
            document.getElementById('licenseModal').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
        } else {
            document.getElementById('licenseError').style.display = 'block';
            localStorage.removeItem('ai_premium_license');
            document.getElementById('licenseModal').style.display = 'flex';
        }
    } catch (e) {
        alert('Gagal menghubungi server.');
    }
}

// Konfigurasi Marked.js untuk Custom Code Block + Copy Button
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
    const validLang = Prism.languages[language] ? language : 'markup';
    const highlighted = Prism.highlight(code, Prism.languages[validLang], validLang);
    return `
    <div class="code-container">
        <button class="copy-btn" onclick="copyCode(this)">Copy code</button>
        <pre><code class="language-${validLang}">${highlighted}</code></pre>
    </div>`;
};
marked.setOptions({ renderer: renderer });

function copyCode(button) {
    const codeContainer = button.parentElement;
    const code = codeContainer.querySelector('code').innerText;
    
    navigator.clipboard.writeText(code).then(() => {
        button.innerText = 'Copied!';
        setTimeout(() => button.innerText = 'Copy code', 2000);
    });
}

// Handle textarea Enter to send
document.getElementById('promptInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const input = document.getElementById('promptInput');
    const text = input.value.trim();
    const chatBox = document.getElementById('chatBox');
    const sendBtn = document.getElementById('sendBtn');

    if (!text) return;

    // Tambah pesan user
    chatBox.innerHTML += `
        <div class="message user">
            <div class="avatar">👤</div>
            <div class="content">${text.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    
    input.value = '';
    sendBtn.disabled = true;
    chatBox.scrollTop = chatBox.scrollHeight;

    // Loading State
    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `
        <div class="message ai" id="${loadingId}">
            <div class="avatar">🤖</div>
            <div class="content"><i>Sedang berpikir...</i></div>
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text, license: currentLicense })
        });
        
        const data = await res.json();
        const loadingEl = document.getElementById(loadingId);
        
        if (res.status === 403) {
            loadingEl.querySelector('.content').innerHTML = `<span style="color:#ff6b6b">Error: ${data.error}</span>`;
            localStorage.removeItem('ai_premium_license');
            setTimeout(() => location.reload(), 2000);
        } else if (data.reply) {
            // Render markdown (termasuk tag code block untuk copy)
            loadingEl.querySelector('.content').innerHTML = marked.parse(data.reply);
        } else {
            loadingEl.querySelector('.content').innerHTML = `<span style="color:#ff6b6b">Gagal mendapatkan respon dari AI.</span>`;
        }
    } catch (e) {
        document.getElementById(loadingId).querySelector('.content').innerHTML = `<span style="color:#ff6b6b">Koneksi terputus.</span>`;
    }

    sendBtn.disabled = false;
    chatBox.scrollTop = chatBox.scrollHeight;
}
