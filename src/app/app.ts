import { Component } from '@angular/core';
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
    { label: 'Portada', page: 1 },
    { label: 'Comparativa UI', page: 5 },
    { label: 'Angular + Bootstrap', page: 13 },
    { label: 'Conclusiones', page: 19 }
  ];
  protected selectedPage = 1;
  protected zoomMode: string | number = 'page-fit';

  protected goToPage(page: number): void {
    this.selectedPage = page;
  }

}
