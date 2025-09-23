import { Hono } from 'hono';
import { poweredBy } from 'hono/powered-by';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/cloudflare-workers';
import health from './app/health';
import api from './app/api';
import { Env } from './types';

const app = new Hono<Env>();

app.use('*', logger());
app.use('*', poweredBy());
app.use(
  '*',
  cors({
    origin: '*', // 開発環境ではすべてのオリジンを許可
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// ルートエンドポイント
app.get('/', (c) => {
  return c.json({
    message: 'Slimoro API Server',
    version: '1.0.0',
  });
});

// 静的ファイルの配信（publicフォルダ）
app.get('/demo', async (c) => {
  // 開発環境では直接HTMLファイルの内容を返す
  const html = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gemini Image Generation Demo</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
          'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }

      .container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 800px;
        width: 100%;
        padding: 40px;
      }

      h1 {
        text-align: center;
        color: #333;
        margin-bottom: 30px;
        font-size: 28px;
      }

      .form-group {
        margin-bottom: 25px;
      }

      label {
        display: block;
        margin-bottom: 8px;
        color: #555;
        font-weight: 600;
      }

      input[type='text'],
      input[type='file'] {
        width: 100%;
        padding: 12px;
        border: 2px solid #e1e8ed;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.3s;
      }

      input[type='text']:focus,
      input[type='file']:focus {
        outline: none;
        border-color: #667eea;
      }

      .file-input-wrapper {
        position: relative;
      }

      .file-info {
        margin-top: 8px;
        color: #888;
        font-size: 14px;
      }

      button {
        width: 100%;
        padding: 15px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.3s, box-shadow 0.3s;
      }

      button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .loading {
        display: none;
        text-align: center;
        margin-top: 20px;
      }

      .loading.show {
        display: block;
      }

      .spinner {
        display: inline-block;
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .result {
        margin-top: 30px;
        display: none;
      }

      .result.show {
        display: block;
      }

      .result h2 {
        color: #333;
        margin-bottom: 20px;
        font-size: 22px;
      }

      .image-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 20px;
      }

      .image-box {
        text-align: center;
      }

      .image-box h3 {
        color: #555;
        margin-bottom: 10px;
        font-size: 16px;
      }

      .image-box img {
        width: 100%;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .error {
        display: none;
        background: #fee;
        border: 1px solid #fcc;
        color: #c33;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
      }

      .error.show {
        display: block;
      }

      @media (max-width: 600px) {
        .image-container {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🎨 Gemini Image Generation Demo</h1>

      <form id="generateForm">
        <div class="form-group">
          <label for="prompt">プロンプト（画像生成の指示）</label>
          <input
            type="text"
            id="prompt"
            name="prompt"
            placeholder="例: Create a picture of my cat eating a nano-banana in a fancy restaurant"
            required
          />
        </div>

        <div class="form-group">
          <label for="image">入力画像</label>
          <div class="file-input-wrapper">
            <input
              type="file"
              id="image"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <div class="file-info">
              対応形式: JPEG, PNG, WebP (最大10MB)
            </div>
          </div>
        </div>

        <button type="submit" id="submitBtn">画像を生成</button>
      </form>

      <div class="loading" id="loading">
        <div class="spinner"></div>
        <p style="margin-top: 15px; color: #666">
          画像を生成中です...しばらくお待ちください
        </p>
      </div>

      <div class="error" id="error"></div>

      <div class="result" id="result">
        <h2>生成結果</h2>
        <div class="image-container">
          <div class="image-box">
            <h3>入力画像</h3>
            <img id="inputImage" alt="入力画像" />
          </div>
          <div class="image-box">
            <h3>生成画像</h3>
            <img id="outputImage" alt="生成画像" />
          </div>
        </div>
      </div>
    </div>

    <script>
      const form = document.getElementById('generateForm');
      const submitBtn = document.getElementById('submitBtn');
      const loading = document.getElementById('loading');
      const error = document.getElementById('error');
      const result = document.getElementById('result');
      const inputImage = document.getElementById('inputImage');
      const outputImage = document.getElementById('outputImage');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UIをリセット
        error.classList.remove('show');
        result.classList.remove('show');
        loading.classList.add('show');
        submitBtn.disabled = true;

        try {
          const formData = new FormData(form);
          const file = formData.get('image');

          // 入力画像をプレビュー
          const reader = new FileReader();
          reader.onload = (e) => {
            inputImage.src = e.target.result;
          };
          reader.readAsDataURL(file);

          // 同一オリジンでのAPIリクエスト
          let response;
          try {
            response = await fetch('/api/generate-image', {
              method: 'POST',
              body: formData,
            });
          } catch (fetchError) {
            throw new Error(\`ネットワークエラー: \${fetchError.message}\`);
          }

          let data;
          try {
            const responseText = await response.text();
            data = JSON.parse(responseText);
          } catch (parseError) {
            throw new Error('サーバーからの応答が不正です');
          }

          if (!response.ok) {
            throw new Error(data.error || data.message || 'エラーが発生しました');
          }

          if (data.success) {
            // 生成画像を表示
            outputImage.src = \`data:\${data.mimeType};base64,\${data.imageBase64}\`;
            result.classList.add('show');
          } else {
            throw new Error(data.error || '画像生成に失敗しました');
          }
        } catch (err) {
          error.textContent = \`エラー: \${err.message}\`;
          error.classList.add('show');
        } finally {
          loading.classList.remove('show');
          submitBtn.disabled = false;
        }
      });

      // ファイル選択時のバリデーション
      document.getElementById('image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            alert('ファイルサイズは10MB以下にしてください');
            e.target.value = '';
            return;
          }

          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            alert('JPEG、PNG、WebP形式のファイルを選択してください');
            e.target.value = '';
            return;
          }
        }
      });
    </script>
  </body>
</html>`;

  return c.html(html);
});

// APIの健康チェック
app.route('/health', health);
// API実装のマウント
app.route('/api', api);

export default app;
