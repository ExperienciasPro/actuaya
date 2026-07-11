import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Service to communicate UI state between deeply nested components
 * and the main app shell (AdminHomeComponent).
 */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  /** When true, the main sidebar should be hidden (e.g. book mode) */
  private _sidebarHidden = new BehaviorSubject<boolean>(false);
  sidebarHidden$ = this._sidebarHidden.asObservable();

  /** Emits when user requests to exit focused mode (back button) */
  private _exitFocusMode = new Subject<void>();
  exitFocusMode$ = this._exitFocusMode.asObservable();

  hideSidebar(): void { this._sidebarHidden.next(true); }
  showSidebar(): void { this._sidebarHidden.next(false); }

  /** Called from the shell's back button — triggers full restore */
  requestExitFocusMode(): void {
    this._sidebarHidden.next(false);
    this._exitFocusMode.next();
  }
}
