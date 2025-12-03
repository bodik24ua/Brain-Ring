import { Link } from 'react-router-dom'; // Імпортуємо Link

function HomePage() {
  return (
    <div>
      <h1>Оберіть вашу роль</h1>

      {/* Створюємо список посилань */}
      <nav>
        <ul>
          <li>
            <button style={{ margin: '10px'}}><Link to="/host">Ведучий</Link></button>
          </li>
          <li>
            <button style={{ margin: '10px'}}><Link to="/player">Гравець</Link></button>
          </li>
          <li>
            <button style={{ margin: '10px'}}><Link to="/results">Перегляд результатів</Link></button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default HomePage;