import Alarm from './components/user/Alarm';
import MainPage from './pages/MainPage';
import LandingPage from './pages/LandingPage';
import Login from './components/login/Login';
import Header from './components/Header';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import KakaoLogin from './components/login/KakaoLogin';
import StarDetail from 'components/star/StarDetail';
import { Link } from 'react-router-dom';

localStorage.setItem('isLogin', true); // 테스트용

function App() {
    const isLogin = localStorage.getItem('isLogin');

    return (
        <div className="App">
            <Header />
            <Routes>
                {/* url이 3000이 아니라서 클라이언트쪽에서 특정 페이지로 이동하게 만들지 못함 */}
                <Route
                    path="/member/join/kakao"
                    element={<KakaoLogin />}
                ></Route>
                <Route exact path="/landing/login" element={<Login />}></Route>
                <Route path="/space/alarm" element={<Alarm />} />
            </Routes>

            <Link to="/space/star/0">
                <button>게시글 상세보기 테스트 페이지</button>
            </Link>
        </div>
    );
}
export default App;
