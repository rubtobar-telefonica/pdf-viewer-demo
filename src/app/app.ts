import { Component, NgZone, type AfterViewInit, type OnDestroy } from '@angular/core';
import { NgxExtendedPdfViewerModule, type PagesLoadedEvent } from 'ngx-extended-pdf-viewer';

type ZoomType = string | number;

interface PdfPageButton {
  label: string;
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
        { label: 'Evidencia 1', page: 1 },
        { label: 'Evidencia 2', page: 4 },
        { label: 'Evidencia 3', page: 15 },
        { label: 'Evidencia 4', page: 25 }
      ],
      currentPage: 1,
      zoom: 'page-fit',
    },
    {
      id: 'doc-2',
      label: 'documento-2',
      src: 'pdfs/sample-local-pdf.pdf',
      pageButtons: [
        { label: 'Evidencia 1', page: 1 },
        { label: 'Evidencia 2', page: 2 },
        { label: 'Evidencia 3', page: 3 },
      ],
      currentPage: 1,
      zoom: 'page-fit',
    },
    {
      id: 'doc-3',
      label: 'documento-3',
      src: 'pdfs/sample-2.pdf',
      pageButtons: [
        { label: 'Evidencia 1', page: 1 },
        { label: 'Evidencia 2', page: 2 },
        { label: 'Evidencia 3', page: 3 },
      ],
      currentPage: 1,
      zoom: 'page-fit',
    }
  ];

  protected activeDoc: PdfDocument = this.documents[0];

  private removeKeydown?: () => void;
  private removeWheel?: () => void;

  constructor(private readonly zone: NgZone) { }

  protected selectDocument(doc: PdfDocument): void {
    if (this.activeDoc === doc) {
      return;
    }

    this.activeDoc = doc;
    doc.currentPage = doc.currentPage || 1;
    doc.zoom = 'page-fit';
  }

  protected goToPage(page: number, doc: PdfDocument = this.activeDoc): void {
    if (this.activeDoc !== doc) {
      this.selectDocument(doc);
    }

    doc.currentPage = page;
  }

  protected onPagesLoaded(event: PagesLoadedEvent | undefined, doc: PdfDocument): void {
    const app = (window as any).PDFViewerApplication;
    const scale: number = app?.pdfViewer?.currentScale ?? 1;
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
  }

  ngOnDestroy(): void {
    this.removeKeydown?.();
    this.removeWheel?.();
  }
}
