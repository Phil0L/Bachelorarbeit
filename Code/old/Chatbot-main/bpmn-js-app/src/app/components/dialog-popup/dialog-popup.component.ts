import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-new-diagram-dialog',
  templateUrl: './dialog-popup.component.html',
  styleUrl: './dialog-popup.component.css'
})
export class DialogPopupComponent {
  diagramInstructions = '';
  isLoading = false;
  error = false;

  constructor(public dialogRef: MatDialogRef<DialogPopupComponent>,private http: HttpClient) {}

  onNoClick(): void {
    this.error = false;
    this.isLoading = false;
    this.dialogRef.close();
  }
  createDiagram(): void {
    this.error = false;
    this.isLoading = true;
    console.log(this.diagramInstructions);
    if (this.diagramInstructions.trim() === '') {
      this.isLoading = false;
      return;
    } else {
      this.http.post('http://localhost:1207/create', { inputString: this.diagramInstructions }).subscribe(
        data => {
          // handle the loaded data
          this.isLoading = false;
          this.error = false;
          this.dialogRef.close();
        },
        error => {
          this.error = true;
          this.isLoading = false;
        }
      );
    }
  }
}