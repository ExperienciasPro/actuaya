import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AssessmentState {
    testId: string | null;
    gender: string | null;
    birthYear: number | null;
    startTime: number | null;
    endTime: number | null;
    tiempoTranscurrido: number | null;
    answers: { questionId: string, value: any }[];
    datosFormulario: any;
}

@Injectable({
    providedIn: 'root'
})
export class AssessmentStateService {
    private initialState: AssessmentState = {
        testId: null,
        gender: null,
        birthYear: null,
        startTime: null,
        endTime: null,
        tiempoTranscurrido: null,
        answers: [],
        datosFormulario: null
    };

    private stateSubject = new BehaviorSubject<AssessmentState>(this.loadState());
    public state$ = this.stateSubject.asObservable();

    private loadState(): AssessmentState {
        const saved = sessionStorage.getItem('testea_assessment_state');
        return saved ? JSON.parse(saved) : this.initialState;
    }

    private saveState(state: AssessmentState): void {
        sessionStorage.setItem('testea_assessment_state', JSON.stringify(state));
        this.stateSubject.next(state);
    }

    setTestId(id: string): void {
        const state = this.stateSubject.getValue();
        this.saveState({ ...state, testId: id });
    }

    setDemographics(gender: string, birthYear: number, startTime: number): void {
        const state = this.stateSubject.getValue();
        this.saveState({ ...state, gender, birthYear, startTime });
    }

    saveAnswer(questionId: string, answerValue: any): void {
        const state = this.stateSubject.getValue();
        const newAnswers = [...state.answers];
        const existingIndex = newAnswers.findIndex(a => a.questionId === questionId);

        if (existingIndex > -1) {
            newAnswers[existingIndex] = { questionId, value: answerValue };
        } else {
            newAnswers.push({ questionId, value: answerValue });
        }

        this.saveState({ ...state, answers: newAnswers });
    }

    finishAssessment(tiempoTranscurrido?: number): void {
        const state = this.stateSubject.getValue();
        this.saveState({ ...state, endTime: Date.now(), tiempoTranscurrido: tiempoTranscurrido || null });
    }

    setFormData(data: any): void {
        const state = this.stateSubject.getValue();
        this.saveState({ ...state, datosFormulario: data });
    }

    clearState(): void {
        sessionStorage.removeItem('testea_assessment_state');
        this.stateSubject.next(this.initialState);
    }

    getCurrentState(): AssessmentState {
        return this.stateSubject.getValue();
    }
}
