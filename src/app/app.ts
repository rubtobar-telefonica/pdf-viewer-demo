import { Component, NgZone, type AfterViewInit, type OnDestroy } from '@angular/core';
import { NgxExtendedPdfViewerModule, type PagesLoadedEvent } from 'ngx-extended-pdf-viewer';

type ZoomType = string | number;

interface HighlightArea {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HighlightOverlay {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PdfPageButton {
  label: string;
  page: number;
  highlight?: HighlightArea;
}

interface PdfHighlight extends HighlightArea {
  page: number;
}

interface PdfDocument {
  id: string;
  label: string;
  src: string;
  pageButtons: PdfPageButton[];
  currentPage: number;
  zoom: ZoomType;
  pendingPage?: number;
  currentHighlight?: PdfHighlight;
  highlightOverlay?: HighlightOverlay;
}

@Component({
  selector: 'app-root',
  imports: [NgxExtendedPdfViewerModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly documents: PdfDocument[] = [
    {
      id: 'doc-1',
      label: 'documento-1',
      src: '/pdfs/file-example_PDF_1MB.pdf',
      pageButtons: [
        { label: 'Evidencia 1', page: 1, highlight: { top: 25, left: 10, width: 80, height: 18 } },
        { label: 'Evidencia 2', page: 4, highlight: { top: 49, left: 10, width: 80, height: 5 } },
        { label: 'Evidencia 3', page: 15, highlight: { top: 50, left: 10, width: 80, height: 20 } },
        { label: 'Evidencia 4', page: 25, highlight: { top: 50, left: 10, width: 80, height: 20 } }
      ],
      currentPage: 1,
      zoom: 'page-fit',
    },
    {
      id: 'doc-2',
      label: 'documento-2',
      src: 'pdfs/sample-local-pdf.pdf',
      pageButtons: [
        { label: 'Evidencia 1', page: 1, highlight: { top: 18, left: 5, width: 90, height: 14 } },
        { label: 'Evidencia 2', page: 2, highlight: { top: 55, left: 5, width: 90, height: 10 } },
        { label: 'Evidencia 3', page: 3, highlight: { top: 35, left: 5, width: 90, height: 9 } },
      ],
      currentPage: 1,
      zoom: 'page-fit',
    },
    {
      id: 'doc-3',
      label: 'documento-3',
      src: 'pdfs/sample-2.pdf',
      pageButtons: [
        { label: 'Evidencia 1', page: 1, highlight: { top: 30, left: 35, width: 30, height: 2 } },
        { label: 'Evidencia 2', page: 2, highlight: { top: 69.5, left: 15, width: 70, height: 3 } },
        { label: 'Evidencia 3', page: 3, highlight: { top: 23, left: 49, width: 26, height: 4 } },
      ],
      currentPage: 1,
      zoom: 'page-fit',
    }
  ];

  protected activeDoc: PdfDocument = this.documents[0];

  private removeKeydown?: () => void;
  private removeWheel?: () => void;
  private removeViewerScroll?: () => void;
  private removeResize?: () => void;

  constructor(private readonly zone: NgZone) { }

  protected selectDocument(doc: PdfDocument): void {
    if (this.activeDoc === doc) {
      return;
    }

    this.activeDoc = doc;
    doc.currentPage = doc.currentPage || 1;
    doc.zoom = 'page-fit';
    if (doc.currentHighlight) {
      this.scheduleHighlightUpdate(doc);
    }
  }

  protected goToPage(page: number, doc: PdfDocument = this.activeDoc): void {
    if (this.activeDoc !== doc) {
      this.selectDocument(doc);
    }

    doc.currentPage = page;
    doc.currentHighlight = undefined;
    doc.highlightOverlay = undefined;
  }

  protected goToEvidence(button: PdfPageButton, doc: PdfDocument = this.activeDoc): void {
    const targetDoc = doc;
    if (this.activeDoc !== targetDoc) {
      this.selectDocument(targetDoc);
    }

    targetDoc.currentHighlight = button.highlight
      ? { ...button.highlight, page: button.page }
      : undefined;
    targetDoc.highlightOverlay = undefined;
    targetDoc.currentPage = button.page;
    this.scheduleHighlightUpdate(targetDoc);
  }

  protected onPagesLoaded(event: PagesLoadedEvent | undefined, doc: PdfDocument): void {
    if (doc.currentHighlight) {
      this.scheduleHighlightUpdate(doc);
    }
    // Ensure scroll listeners are bound to the freshly created viewerContainer
    this.attachViewerListeners(0, true);
  }

  protected isActive(doc: PdfDocument): boolean {
    return this.activeDoc === doc;
  }

  // Eliminamos la posibilidad de hacer Zoom sobre el PDF, tanto con el mouse como con teclado.
  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const keydownHandler = (event: KeyboardEvent) => {
        const ctrlLike = event.ctrlKey || event.metaKey;
        const key = event.key;

        const isPlus = key === '+' || key === '=';
        const isMinus = key === '-' || key === '_';
        const isZero = key === '0' || key === ')';
        const isNumpadPlus = event.code === 'NumpadAdd';
        const isNumpadMinus = event.code === 'NumpadSubtract';
        const isNumpadZero = event.code === 'Numpad0';

        if (ctrlLike && (isPlus || isMinus || isZero || isNumpadPlus || isNumpadMinus || isNumpadZero)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };

      const wheelHandler = (event: WheelEvent) => {
        if (event.ctrlKey || (event as any).metaKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };

      window.addEventListener('keydown', keydownHandler, { capture: true });
      window.addEventListener('wheel', wheelHandler, { capture: true, passive: false });

      this.removeKeydown = () => window.removeEventListener('keydown', keydownHandler, { capture: true } as any);
      this.removeWheel = () => window.removeEventListener('wheel', wheelHandler, { capture: true } as any);
    });

    this.attachViewerListeners();
  }

  ngOnDestroy(): void {
    this.removeKeydown?.();
    this.removeWheel?.();
    this.removeViewerScroll?.();
    this.removeResize?.();
  }

  private attachViewerListeners(attempt = 0, rebind = false): void {
    const viewerContainer = document.getElementById('viewerContainer');
    if (!viewerContainer) {
      if (attempt < 10) {
        setTimeout(() => this.attachViewerListeners(attempt + 1, rebind), 150);
      }
      return;
    }

    if (rebind) {
      this.removeViewerScroll?.();
      this.removeViewerScroll = undefined;
    }

    if (!this.removeViewerScroll) {
      const onScroll = () => this.updateAllHighlights();
      viewerContainer.addEventListener('scroll', onScroll, { passive: true });
      this.removeViewerScroll = () => viewerContainer.removeEventListener('scroll', onScroll);
    }

    const onResize = () => this.updateAllHighlights();
    window.addEventListener('resize', onResize, { passive: true });
    this.removeResize = () => window.removeEventListener('resize', onResize);
  }

  private updateAllHighlights(): void {
    this.zone.runOutsideAngular(() => {
      for (const doc of this.documents) {
        if (doc.currentHighlight) {
          this.updateHighlightPosition(doc);
        }
      }
    });
  }

  private scheduleHighlightUpdate(doc: PdfDocument): void {
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.updateHighlightPosition(doc));
      setTimeout(() => this.updateHighlightPosition(doc), 200);
    });
  }

  private updateHighlightPosition(doc: PdfDocument): void {
    const highlight = doc.currentHighlight;
    if (!highlight) {
      this.zone.run(() => {
        doc.highlightOverlay = undefined;
      });
      return;
    }

    const container = document.querySelector<HTMLElement>(`[data-doc-id="${doc.id}"]`);
    if (!container) {
      return;
    }

    const viewerContainer = document.getElementById('viewerContainer');
    const pageSelector = `.page[data-page-number="${highlight.page}"]`;
    const pageElement = viewerContainer?.querySelector<HTMLElement>(pageSelector);

    if (!pageElement) {
      return;
    }

    const pageRect = pageElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (!pageRect.width || !pageRect.height) {
      return;
    }

    const topPx = pageRect.top - containerRect.top + (highlight.top / 100) * pageRect.height;
    const leftPx = pageRect.left - containerRect.left + (highlight.left / 100) * pageRect.width;
    const widthPx = (highlight.width / 100) * pageRect.width;
    const heightPx = (highlight.height / 100) * pageRect.height;

    this.zone.run(() => {
      doc.highlightOverlay = {
        top: topPx,
        left: leftPx,
        width: widthPx,
        height: heightPx
      };
    });
  }
}
