import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogPopupComponent } from './components/dialog-popup/dialog-popup.component';
import { DiagramComponent } from './components/diagram/diagram.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { InfoPopupComponent } from './components/info-popup/info-popup.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  // get the diagram component for diagram saving
  @ViewChild('diagramComp') diagramComponent: DiagramComponent;

  title = 'bpmn-js-angular';
  diagramUrl = '';
  importError?: Error;
  files: any[] = [];
  instructions: string[] = [];
  diagramTitle: string = 'Select a diagram from the list or create one in the editor.';
  diagramID: string = ''
  diagramUpdates: string = '';
  isLoading: boolean = false;
  error: boolean = false;
  sidebarCollapsed: boolean = false;

  /**
   * Handle the imported event once a diagram is (attempted to be) loaded
   * @param event 
   */
  handleImported(event) {
    const {
      type,
      error,
      warnings
    } = event;
    if (type === 'success') {
      console.log(`Rendered diagram (%s warnings)`, warnings.length);
    }
    if (type === 'error') {
      console.error('Failed to render diagram', error);
    }
    this.importError = error;
  }

  /**
   * Makes the diagram component accessible once it is loaded
   */
  ngAfterViewInit(): void {}

  /**
   * Sort diagrams by date
   */
  sortDiagramsByDate(files: any[]): any[] {
    return files.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  /**
   * Group diagrams by date
   */
  isOlderThanOneWeek(date: string): boolean {
    const fileDate = new Date(date);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return fileDate < oneWeekAgo;
  }
    isOlderThanThirtyDays(date: string): boolean {
    const fileDate = new Date(date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return fileDate < thirtyDaysAgo;
  }

  /**
   * Constructor function
   * @param http 
   * @param dialog 
   */
  constructor(private http: HttpClient, public dialog: MatDialog) {
    // set file list
    this.http.get('http://localhost:1207/database').subscribe((data: any[]) => {
      this.files = this.sortDiagramsByDate(data);
    });
  }

  /**
   * Process the instructions for the GPT model
   * @param instructions 
   * @returns 
   */
  processInstructions(instructions: string): string[]{
    return instructions.split('(NEXT)');
  }

  /**
   * Load the data for the selected diagram from the list
   * @param file selected diagram
   */
  onFileClick(file: any) {
    // create new diagram
    if (file === 'new') {
      const dialogRef = this.dialog.open(DialogPopupComponent);
      dialogRef.afterClosed().subscribe(() => {
        this.refreshFileList().then(() =>{
          const latestDiagram = this.files[0];
          // assign all values of the diagram to the component
          this.diagramUrl = `http://localhost:1207/${latestDiagram.path}`;
          this.instructions = this.processInstructions(latestDiagram.scenario);
          this.diagramTitle = latestDiagram.title;
          this.diagramID = latestDiagram.thread;
        });
      });
      return;
    } else {
      // assign all values of the diagram to the component
      this.diagramUrl = `http://localhost:1207/${file.path}`;
      this.instructions = this.processInstructions(file.scenario);
      this.diagramTitle = file.title;
      this.diagramID = file.thread;
    }
    this.error = false;
  }

  /**
   * Refresh the file list
   */
  refreshFileList(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get('http://localhost:1207/database').subscribe(
        (data: any[]) => {
          this.files = this.sortDiagramsByDate(data);
          resolve();
        },
        error => {
          console.log(error);
          reject(error);
        }
      );
    });
  }

  /**
   * Send the instructions to the server to create a new diagram
   */
  sendUpdate():void {
    console.log(this.diagramID)
    this.isLoading = true;
    this.error = false;
    this.http.post('http://localhost:1207/update', { id: this.diagramID , inputString: this.diagramUpdates }).subscribe(
            data => {
              // handle the loaded data
              this.refreshFileList();
              this.instructions.push(this.diagramUpdates);
              this.diagramUpdates = '';

              // refresh the diagram by appending a timestamp query parameter
              const timestamp = new Date().getTime();
              this.diagramUrl = `${this.diagramUrl.split('?')[0]}?timestamp=${timestamp}`;

              this.isLoading = false;
            },
            error => {
              this.isLoading = false;
              this.error = true;
            }
        );
  }

  /**
   * Save the diagram to the server
   */
  saveDiagram(): void {
    this.diagramComponent.saveDiagram().then(result => {
      this.http.post('http://localhost:1207/save', { id: this.diagramID, xml: result.xml }).subscribe(() => {
        console.log('Diagram saved', result.xml);
      });
    }).catch(error => {
      // I dont understand why there is an error here, it still works
      console.error('Error saving diagram', error);
    });
  }

  /**
   * Delete the diagram from the server
   */
  deleteDiagram(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px'
    });

    //The dialogRef.afterClosed() method subscribes to the event that occurs after the dialog is closed. 
    //The result parameter indicates whether the user confirmed the deletion.
    //see confirm-dialog.component.html
    dialogRef.afterClosed().subscribe(result => {
      if (result) {

        //see manageData.ts how the deletion works
        this.http.post('http://localhost:1207/delete/', { id: this.diagramID }).subscribe(
          () => {
            console.log('The file was deleted.');
            this.refreshFileList().then(() => {
              this.diagramUrl = '';
              this.instructions = [];
              this.diagramTitle = 'Select a diagram from the list or create one in the editor.';
              this.diagramID = '';
            });
          },
          (error) => {
            console.error(error);
            // workaround, I do not understand the error message
            this.refreshFileList().then(() => {
              this.diagramUrl = '';
              this.instructions = [];
              this.diagramTitle = 'Select a diagram from the list or create one in the editor.';
              this.diagramID = '';
            });
          }
        );
      }
    });
  }

  /**
   * Export the diagram to a file
   * Download the diagram as a .xml file
   */
  exportDiagram() {
    if (this.diagramComponent) {
      this.diagramComponent.saveDiagram().then(({ xml, err }) => {
        if (err) {
          console.error('Could not export diagram', err);
        } else {
          const blob = new Blob([xml], { type: 'application/bpmn+xml' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.diagramTitle || 'diagram.bpmn';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      });
    } else {
      console.error('No diagram to export');
    }
  }

  openInfoPopup() {
    this.dialog.open(InfoPopupComponent, {
      width: '350px'
    }).afterClosed().subscribe(result => {
      this.refreshFileList().then(() => {
        this.diagramUrl = '';
        this.instructions = [];
        this.diagramTitle = 'Select a diagram from the list or create one in the editor.';
        this.diagramID = '';
      });
    });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  
}
