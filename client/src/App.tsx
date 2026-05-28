import AppRouter from './app/Router';
import ToastContainer from './components/ui/Toast';
import ThemeProvider from './providers/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <AppRouter />
      <ToastContainer />
    </ThemeProvider>
  );
}
