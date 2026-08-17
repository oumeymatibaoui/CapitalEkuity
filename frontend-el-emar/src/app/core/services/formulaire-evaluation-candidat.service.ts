import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface PieceFormulaireCandidat {
  id: number;
  codePiece?: string;
  nomPiece: string;
  raisonPiece?: string;
  noteCandidat?: string;
  formatAccepte?: string;
  obligatoire?: boolean;
  conditionReponse?: string;
  ordreAffichage?: number;
}

export interface CritereFormulaireCandidat {
  id: number;
  codeCritere?: string;
  labelCandidat: string;
  aideCandidat?: string;
  raisonDonnee?: string;
  noteCandidat?: string;
  typeChamp: string;
  optionsChamp?: string;
  obligatoire?: boolean;
  ordreAffichage?: number;
  pieces: PieceFormulaireCandidat[];
}

export interface SectionFormulaireCandidat {
  section: string;
  criteres: CritereFormulaireCandidat[];
}

export interface FormulaireLotCandidat {
  lotId: number;
  nomLot: string;
  sections: SectionFormulaireCandidat[];
}

// Alias si ton component importe FormulaireEvaluationCandidat
export type FormulaireEvaluationCandidat = FormulaireLotCandidat;

@Injectable({
  providedIn: 'root'
})
export class FormulaireEvaluationCandidatService {

  private apiUrl = `${environment.apiBaseUrl}/api/cnd/formulaire-evaluation`;

  constructor(private http: HttpClient) {}

  getFormulaireByLot(lotId: number): Observable<FormulaireLotCandidat> {
    return this.http.get<FormulaireLotCandidat>(`${this.apiUrl}/lots/${lotId}`);
  }
}