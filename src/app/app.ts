import { Component, HostListener, NgZone } from '@angular/core';
import { NgFor } from '@angular/common';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-root',
  imports: [NgFor, NgxExtendedPdfViewerModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly pdfSrc = '/pdfs/file-example_PDF_1MB.pdf';
  protected readonly pageButtons = [
    { label: 'Evidencia 1', page: 1  },
    { label: 'Evidencia 2', page: 5  },
    { label: 'evidencia 3', page: 13 },
    { label: 'evidencia 4', page: 19 },
  ];
  protected selectedPage = 1;
  zoom: string = 'page-fit';

  protected goToPage(page: number): void {
    this.selectedPage = page;
  }

  onZoomChange(next: string | number | any) {
    if (next !== 'page-fit') this.zoom = 'page-fit';
  }

  private removeKeydown?: () => void;
  private removeWheel?: () => void;

  constructor(private zone: NgZone) { }

  ngAfterViewInit(): void {
    // Importante: registrar en CAPTURE y con passive:false donde aplique
    this.zone.runOutsideAngular(() => {
      const keydownHandler = (e: KeyboardEvent) => {
        // Bloquea Ctrl/Cmd + (+, -, 0) y NumpadAdd/Subtract/0
        const ctrlLike = e.ctrlKey || e.metaKey;
        const key = e.key;

        const isPlus = key === '+' || key === '=';        // '=' + Shift suele ser '+'
        const isMinus = key === '-' || key === '_';
        const isZero = key === '0' || key === ')';

        const isNumpadPlus = e.code === 'NumpadAdd';
        const isNumpadMinus = e.code === 'NumpadSubtract';
        const isNumpadZero = e.code === 'Numpad0';

        if (ctrlLike && (isPlus || isMinus || isZero || isNumpadPlus || isNumpadMinus || isNumpadZero)) {
          e.preventDefault();
          e.stopImmediatePropagation(); // para adelantarnos a PDF.js
          return;
        }
      };

      const wheelHandler = (e: WheelEvent) => {
        // Bloquea Ctrl/Cmd + rueda (zoom del visor)
        if (e.ctrlKey || (e as any).metaKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };

      window.addEventListener('keydown', keydownHandler, { capture: true });
      window.addEventListener('wheel', wheelHandler, { capture: true, passive: false });

      this.removeKeydown = () => window.removeEventListener('keydown', keydownHandler, { capture: true } as any);
      this.removeWheel = () => window.removeEventListener('wheel', wheelHandler, { capture: true } as any);
    });
  }

  ngOnDestroy(): void {
    this.removeKeydown?.();
    this.removeWheel?.();
  }
}
