import { Subject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastEvent {
    type: ToastType;
    message: string;
    duration?: number;
}

class ToastService {
    private toastSubject = new Subject<ToastEvent>();

    public get toast$() {
        return this.toastSubject.asObservable();
    }

    public show(type: ToastType, message: string, duration: number = 3000) {
        this.toastSubject.next({ type, message, duration });
    }

    public info(message: string, duration?: number) {
        this.show('info', message, duration);
    }

    public success(message: string, duration?: number) {
        this.show('success', message, duration);
    }

    public error(message: string, duration?: number) {
        this.show('error', message, duration);
    }

    public warning(message: string, duration?: number) {
        this.show('warning', message, duration);
    }
}

export const toastService = new ToastService();
