// ═══════════════════════════════════════════════════════════════
// SLIDER LIMPO & AUTOMÁTICO - VOLLEN IOT
// Transição automática contínua + Apenas setas laterais para trocar
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const sliders = document.querySelectorAll('.vollen-slider');

  sliders.forEach((container) => {
    const slides = Array.from(container.querySelectorAll('.slider-slide'));
    const prevBtn = container.querySelector('.slider-btn-prev');
    const nextBtn = container.querySelector('.slider-btn-next');

    if (!slides.length) return;

    let currentIndex = 0;
    let timer = null;
    const duration = parseInt(container.dataset.interval || '4000', 10);

    const showSlide = (index) => {
      if (index < 0) {
        currentIndex = slides.length - 1;
      } else if (index >= slides.length) {
        currentIndex = 0;
      } else {
        currentIndex = index;
      }

      slides.forEach((slide, idx) => {
        if (idx === currentIndex) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });
    };

    const nextSlide = () => {
      showSlide(currentIndex + 1);
    };

    const prevSlide = () => {
      showSlide(currentIndex - 1);
    };

    const startTimer = () => {
      stopTimer();
      timer = setInterval(nextSlide, duration);
    };

    const stopTimer = () => {
      if (timer) clearInterval(timer);
    };

    // Navegação por setas laterais
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prevSlide();
        startTimer();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nextSlide();
        startTimer();
      });
    }

    // Pausa no hover para leitura confortável
    container.addEventListener('mouseenter', stopTimer);
    container.addEventListener('mouseleave', startTimer);

    // Suporte a swipe em telas touch
    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      stopTimer();
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        nextSlide();
      } else if (touchEndX - touchStartX > 50) {
        prevSlide();
      }
      startTimer();
    }, { passive: true });

    // Iniciar
    showSlide(0);
    startTimer();
  });
});
