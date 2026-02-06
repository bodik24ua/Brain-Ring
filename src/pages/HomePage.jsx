import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <h1>{t('welcome')}</h1>

      {/* список посилань */}
      <nav>
      <ul style={{ listStyleType: 'none', padding: 0 }}> 
        <li>
          <button 
            style={{ margin: '10px'}} 
            onClick={() => navigate('/host')}
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