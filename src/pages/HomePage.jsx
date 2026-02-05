import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('welcome')}</h1>

      {/* Створюємо список посилань */}
      <nav>
        <ul>
          <li>
            <button style={{ margin: '10px'}}><Link to="/host">{t('host')}</Link></button>
          </li>
          <li>
            <button style={{ margin: '10px'}}><Link to="/player">{t('player')}</Link></button>
          </li>
          <li>
            <button style={{ margin: '10px'}}><Link to="/results">{t('results')}</Link></button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default HomePage;