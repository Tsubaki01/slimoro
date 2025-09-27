import { Hono } from "hono";

import { Env } from "@/types";

const app = new Hono<Env>();

app.get('/', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>🏋️ Body Shape Transformation Demo - Slimoro</title>
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
        align-items: flex-start;
        padding: 20px;
      }

      .container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 1200px;
        width: 100%;
        padding: 40px;
        margin: 20px 0;
      }

      h1 {
        text-align: center;
        color: #333;
        margin-bottom: 30px;
        font-size: 28px;
      }

      .form-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-bottom: 30px;
      }

      .form-section {
        background: #f8f9fa;
        padding: 25px;
        border-radius: 12px;
        border: 1px solid #e1e8ed;
      }

      .section-title {
        color: #333;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 20px;
        border-bottom: 2px solid #667eea;
        padding-bottom: 8px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-row {
        display: flex;
        gap: 15px;
      }

      .form-row .form-group {
        flex: 1;
      }

      label {
        display: block;
        margin-bottom: 8px;
        color: #555;
        font-weight: 600;
        font-size: 14px;
      }

      input[type='text'],
      input[type='number'],
      input[type='file'],
      input[type='range'] {
        width: 100%;
        padding: 12px;
        border: 2px solid #e1e8ed;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.3s;
      }

      input[type='text']:focus,
      input[type='number']:focus,
      input[type='file']:focus {
        outline: none;
        border-color: #667eea;
      }

      input[type='range'] {
        padding: 8px 0;
      }

      .range-value {
        display: inline-block;
        background: #667eea;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        margin-left: 10px;
      }

      .checkbox-group {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
      }

      input[type='checkbox'] {
        width: auto;
        transform: scale(1.2);
      }

      .target-group {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        background: white;
      }

      .target-header {
        font-weight: 600;
        color: #333;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .target-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: inline-block;
      }

      .target-1 .target-icon {
        background: #4CAF50;
      }

      .target-2 .target-icon {
        background: #FF9800;
      }

      .add-target {
        background: #f8f9fa;
        border: 2px dashed #ddd;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.3s;
      }

      .add-target:hover {
        border-color: #667eea;
      }

      .add-target.hidden {
        display: none;
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
        margin-top: 20px;
      }

      button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
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
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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
        text-align: center;
      }

      .images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }

      .image-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.3s;
      }

      .image-card:hover {
        transform: translateY(-2px);
      }

      .image-card h3 {
        background: #667eea;
        color: white;
        padding: 15px;
        margin: 0;
        font-size: 16px;
        text-align: center;
      }

      .image-card img {
        width: 100%;
        height: auto;
        display: block;
      }

      .image-meta {
        padding: 15px;
        font-size: 12px;
        color: #666;
        background: #f8f9fa;
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

      .file-info {
        margin-top: 8px;
        color: #888;
        font-size: 12px;
      }

      @media (max-width: 768px) {
        .form-container {
          grid-template-columns: 1fr;
        }

        .form-row {
          flex-direction: column;
        }

        .images-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🏋️ Body Shape Transformation Demo</h1>
      <p style="text-align: center; color: #666; margin-bottom: 30px;">
        Upload a photo and see how you'd look with different body weights using AI
      </p>

      <form id="transformForm">
        <div class="form-container">
          <!-- 左側: 基本設定 -->
          <div class="form-section">
            <h3 class="section-title">📸 Basic Information</h3>

            <div class="form-group">
              <label for="image">Photo Upload</label>
              <input
                type="file"
                id="image"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                required
              />
              <div class="file-info">
                Supported: JPEG, PNG, WebP (max 10MB)
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="height">Height (cm)</label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  min="120"
                  max="220"
                  placeholder="170"
                  required
                />
              </div>
              <div class="form-group">
                <label for="currentWeight">Current Weight (kg)</label>
                <input
                  type="number"
                  id="currentWeight"
                  name="currentWeight"
                  min="20"
                  max="300"
                  placeholder="70"
                  required
                />
              </div>
            </div>

          </div>

          <!-- 右側: 目標設定 -->
          <div class="form-section">
            <h3 class="section-title">🎯 Target Weights</h3>

            <div id="targetContainer">
              <div class="target-group target-1">
                <div class="target-header">
                  <span class="target-icon"></span>
                  Target 1
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      name="target1Weight"
                      min="20"
                      max="300"
                      placeholder="60"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label>Label</label>
                    <input
                      type="text"
                      name="target1Label"
                      placeholder="Slim"
                    />
                  </div>
                </div>
              </div>

              <div class="add-target" id="addTarget">
                <div style="color: #667eea; font-weight: 600;">
                  ➕ Add Second Target (Optional)
                </div>
                <div style="font-size: 12px; color: #888; margin-top: 5px;">
                  Compare two different weights at once
                </div>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" id="submitBtn">🚀 Generate Transformation</button>
      </form>

      <div class="loading" id="loading">
        <div class="spinner"></div>
        <p style="margin-top: 15px; color: #666">
          Transforming your image... This may take a moment ⏱️
        </p>
      </div>

      <div class="error" id="error"></div>

      <div class="result" id="result">
        <h2>✨ Transformation Results</h2>
        <div class="images-grid" id="imagesGrid"></div>
      </div>
    </div>

    <script>
      const form = document.getElementById('transformForm');
      const submitBtn = document.getElementById('submitBtn');
      const loading = document.getElementById('loading');
      const error = document.getElementById('error');
      const result = document.getElementById('result');
      const imagesGrid = document.getElementById('imagesGrid');
      const addTargetBtn = document.getElementById('addTarget');
      const targetContainer = document.getElementById('targetContainer');
      let hasSecondTarget = false;

      // Add second target
      addTargetBtn.addEventListener('click', () => {
        if (hasSecondTarget) return;

        const target2Html = \`
          <div class="target-group target-2" id="target2">
            <div class="target-header">
              <span class="target-icon"></span>
              Target 2
              <button type="button" style="margin-left: auto; background: none; border: none; color: #999; cursor: pointer; padding: 0; font-size: 16px;" onclick="removeTarget2()">✖️</button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  name="target2Weight"
                  min="20"
                  max="300"
                  placeholder="85"
                  required
                />
              </div>
              <div class="form-group">
                <label>Label</label>
                <input
                  type="text"
                  name="target2Label"
                  placeholder="Fuller"
                />
              </div>
            </div>
          </div>
        \`;

        addTargetBtn.insertAdjacentHTML('beforebegin', target2Html);
        addTargetBtn.classList.add('hidden');
        hasSecondTarget = true;
      });

      // Remove second target
      window.removeTarget2 = () => {
        document.getElementById('target2').remove();
        addTargetBtn.classList.remove('hidden');
        hasSecondTarget = false;
      };

      // Form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset UI
        error.classList.remove('show');
        result.classList.remove('show');
        loading.classList.add('show');
        submitBtn.disabled = true;

        try {
          const formData = new FormData();

          // Add image
          const imageFile = form.image.files[0];
          if (!imageFile) {
            throw new Error('Please select an image file');
          }
          formData.append('image', imageFile);

          // Add subject
          const subject = {
            heightCm: parseInt(form.height.value),
            currentWeightKg: parseInt(form.currentWeight.value)
          };
          formData.append('subject', JSON.stringify(subject));

          // Add targets
          const targets = [];
          if (form.target1Weight.value) {
            targets.push({
              weightKg: parseInt(form.target1Weight.value),
              label: form.target1Label.value || \`\${form.target1Weight.value}kg\`
            });
          }
          if (hasSecondTarget && form.target2Weight.value) {
            targets.push({
              weightKg: parseInt(form.target2Weight.value),
              label: form.target2Label.value || \`\${form.target2Weight.value}kg\`
            });
          }
          formData.append('targets', JSON.stringify(targets));

          // Add options
          const options = {
            returnMimeType: 'image/png'
          };
          formData.append('options', JSON.stringify(options));

          // Send request
          const response = await fetch('/api/generate-image/body-shape', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Failed to generate transformation');
          }

          if (data.success && data.images?.length) {
            displayResults(data);
          } else {
            throw new Error('No images generated');
          }

        } catch (err) {
          error.textContent = \`Error: \${err.message}\`;
          error.classList.add('show');
        } finally {
          loading.classList.remove('show');
          submitBtn.disabled = false;
        }
      });

      function displayResults(data) {
        imagesGrid.innerHTML = '';

        // Add original image (preview)
        const file = form.image.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const originalCard = createImageCard(
              'Original Photo',
              e.target.result,
              \`Current: \${form.currentWeight.value}kg (BMI: \${calculateBMI(form.height.value, form.currentWeight.value)})\`
            );
            imagesGrid.appendChild(originalCard);
          };
          reader.readAsDataURL(file);
        }

        // Add generated images
        data.images.forEach((image, index) => {
          const targetWeight = form[\`target\${index + 1}Weight\`]?.value;
          const bmi = targetWeight ? calculateBMI(form.height.value, targetWeight) : '';
          const meta = \`Target: \${targetWeight}kg\${bmi ? \` (BMI: \${bmi})\` : ''}\`;

          const card = createImageCard(
            image.label || \`Transformation \${index + 1}\`,
            \`data:\${image.mimeType};base64,\${image.base64}\`,
            meta
          );
          imagesGrid.appendChild(card);
        });

        // Show metadata
        if (data.metadata) {
          const metaDiv = document.createElement('div');
          metaDiv.style.cssText = 'text-align: center; color: #666; font-size: 12px; margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;';
          metaDiv.innerHTML = \`
            ⏱️ Processing time: \${(data.metadata.processingTimeMs / 1000).toFixed(1)}s |
            🎯 Confidence: \${(data.metadata.confidence * 100).toFixed(1)}% |
            🤖 Model: \${data.metadata.model}
            \${data.metadata.partialFailures ? \`<br>⚠️ \${data.metadata.partialFailures} failed generations\` : ''}
          \`;
          imagesGrid.appendChild(metaDiv);
        }

        result.classList.add('show');
        result.scrollIntoView({ behavior: 'smooth' });
      }

      function createImageCard(title, src, meta) {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = \`
          <h3>\${title}</h3>
          <img src="\${src}" alt="\${title}" loading="lazy" />
          <div class="image-meta">\${meta}</div>
        \`;
        return card;
      }

      function calculateBMI(height, weight) {
        const heightM = height / 100;
        return (weight / (heightM * heightM)).toFixed(1);
      }

      // File validation
      document.getElementById('image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            alert('File size must be less than 10MB');
            e.target.value = '';
            return;
          }

          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            alert('Please select a JPEG, PNG, or WebP file');
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

export default app;