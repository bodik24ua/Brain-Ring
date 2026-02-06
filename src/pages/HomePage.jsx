import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('welcome')}</h1>

      {/* Створюємо список посилань */}
      <nav>
      <ul style={{ listStyleType: 'none', padding: 0 }}> {/* Додав стиль, щоб прибрати крапки списку */}
        <li>
          <button 
            style={{ margin: '10px'}} 
            onClick={() => navigate('/host')} // 3. Використовуй onClick
          >
            {t('host')}
          </button>
        </li>
        <li>
          <button 
            style={{ margin: '10px'}} 
            onClick={() => navigate('/player')}
          >
            {t('player')}
          </button>
        </li>
        <li>
          <button 
            style={{ margin: '10px'}} 
            onClick={() => navigate('/results')}
          >
            {t('results')}
          </button>
        </li>
      </ul>
    </nav>
    </div>
  );
}

export default HomePage;