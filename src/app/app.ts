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
        { label: 'Evidencia 1', page: 1, highlight: { top: 20, left: 12, width: 30, height: 18 } },
        { label: 'Evidencia 2', page: 4, highlight: { top: 45, left: 10, width: 50, height: 22 } },
        { label: 'Evidencia 3', page: 15, highlight: { top: 28, left: 40, width: 35, height: 20 } },
        { label: 'Evidencia 4', page: 25, highlight: { top: 60, left: 25, width: 40, height: 24 } }
      ],
      currentPage: 1,
      zoom: 'page-fit',
    },
    {
      id: 'doc-2',
      label: 'documento-2',
      src: 'pdfs/sample-local-pdf.pdf',
      pageButtons: [
        { label: 'Evidencia 1', page: 1, highlight: { top: 18, left: 18, width: 32, height: 16 } },
        { label: 'Evidencia 2', page: 2, highlight: { top: 50, left: 22, width: 46, height: 18 } },
        { label: 'Evidencia 3', page: 3, highlight: { top: 35, left: 30, width: 36, height: 20 } },
      ],
      currentPage: 1,
      zoom: 'page-fit',
    },
    {
      id: 'doc-3',
      label: 'documento-3',
      src: 'pdfs/sample-2.pdf',
      pageButtons: [
        { label: 'Evidencia 1', page: 1, highlight: { top: 25, left: 12, width: 40, height: 20 } },
        { label: 'Evidencia 2', page: 2, highlight: { top: 42, left: 28, width: 38, height: 18 } },
        { label: 'Evidencia 3', page: 3, highlight: { top: 60, left: 20, width: 45, height: 22 } },
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
  }

  protected isActive(doc: PdfDocument): boolean {
    return this.activeDoc === doc;
  }

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

  private attachViewerListeners(attempt = 0): void {
    const viewerContainer = document.getElementById('viewerContainer');
    if (!viewerContainer) {
      if (attempt < 10) {
        setTimeout(() => this.attachViewerListeners(attempt + 1), 150);
      }
      return;
    }

    const onScroll = () => this.updateAllHighlights();
    viewerContainer.addEventListener('scroll', onScroll, { passive: true });
    this.removeViewerScroll = () => viewerContainer.removeEventListener('scroll', onScroll);

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
