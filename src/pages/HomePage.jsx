import { Link } from 'react-router-dom'; // Імпортуємо Link

function HomePage() {
  return (
    <div>
      <h1>Оберіть вашу роль</h1>

      {/* Створюємо список посилань */}
      <nav>
        <ul>
          <li>
            <Link to="/host">Я - Ведучий</Link>
          </li>
          <li>
            <Link to="/player">Я - Гравець</Link>
          </li>
          <li>
            <Link to="/results">Перегляд результатів</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default HomePage;