// ═══════════════════════════════════════════
// LIGHTBOX & ZOOM DE IMAGENS - VOLLEN IOT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // 1. Criar container do lightbox dinamicamente se não existir
  let lightbox = document.getElementById('lightboxModal');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'lightboxModal';
    lightbox.className = 'lightbox-modal';
    lightbox.innerHTML = `
      <button class="lightbox-close" id="lightboxClose" aria-label="Fechar">&times;</button>
      <div class="lightbox-content">
        <img class="lightbox-img" id="lightboxImg" src="" alt="Ampliação" />
        <div class="lightbox-caption" id="lightboxCaption"></div>
      </div>
    `;
    document.body.appendChild(lightbox);
  }

  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  const openLightbox = (src, alt) => {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxCaption) {
      lightboxCaption.textContent = alt || 'Visualização em alta resolução';
      lightboxCaption.style.display = alt ? 'block' : 'none';
    }
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  lightboxClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
  });

  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  // 2. Anexar clique em todas as imagens relevantes do site
  const attachZoomables = () => {
    const images = document.querySelectorAll(
      'img[src*="assets/dashboard"], img[src*="assets/Screenshot"], img[src*="assets/mobile"], img[src*="assets/capturas"], .zoomable-img'
    );
    images.forEach((img) => {
      img.classList.add('zoomable-img');
      img.title = 'Clique para ampliar em tela cheia';
      img.addEventListener('click', () => {
        openLightbox(img.currentSrc || img.src, img.alt);
      });
    });
  };

  attachZoomables();
});
