import { useEffect } from "react";
import { handleSessionExpired } from "../utils/auth";

function useIdleLogout(timeoutMinutes = 60) {
    useEffect(() => {
        let timer;

        function resetTimer() {
            clearTimeout(timer);

            timer = setTimeout(() => {
                handleSessionExpired();
            }, timeoutMinutes * 60 *1000);
        }

        const events = ["mousemove", "keydown", "click", "scroll"];

        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer();
        
        return () => {
            clearTimeout(timer);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [timeoutMinutes]);
}

export default useIdleLogout;