import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import * as THREE from 'three';
import axios from 'axios';
import {
    atom,
    useRecoilState,
    useRecoilValue,
    useSetRecoilState,
} from 'recoil';
import { Link, useParams } from 'react-router-dom';
import {
    isDeleteAlertOpenState,
    isStarDetailOpenState,
    isStarRegistOpenState,
} from 'components/atom';
import { position, linePosition, MAX_SATR_CNT } from '../../data';
import { useLocation } from 'react-router-dom';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import { useLoader } from '@react-three/fiber';
import { constellationCheck } from 'util';
import { PiShootingStarFill } from 'react-icons/pi';
import swal from 'sweetalert';

// 해당 별자리 내 첫 번째 별 번호, 마지막 별 번호
const starRange = [];
position.forEach((element, index) =>
    starRange.push([element[0][0], element[element.length - 1][0]])
);

///////////////////////////////// ↓ atoms

// 현재 페이지
const curPageState = atom({
    key: 'curPage',
    default: 0,
});

// 현재 페이지에서 작성된 별 목록
const starsState = atom({
    key: 'stars',
    default: [],
});

// 공간 주인과 접속 유저의 친구 여부
const isFollowerState = atom({
    key: 'isFollower',
    default: true,
});

const followingState = atom({
    key: 'following',
    default: [],
});

const followerState = atom({
    key: 'follower',
    default: [],
});

const starLineOpacityState = atom({
    key: 'starLineOpacity',
    default: -1,
});

const followState = atom({
    key: 'followState',
    default: null,
});

///////////////////////////////// ↑ atoms

// isAddedStar : starLocation : starInfo
const isAddedStar = new Map();

function Line(props) {
    const starLineOpacity = useRecoilValue(starLineOpacityState);

    const groupNum = props.groupNum;

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(props.points);

    return (
        <>
            <line geometry={lineGeometry}>
                <lineBasicMaterial
                    attach="material"
                    transparent={props.lineColor}
                    opacity={starLineOpacity === groupNum ? 0.05 : 0.01}
                    color={0xced6ff}
                />
            </line>
        </>
    );
}

function Ground(props) {
    const mesh = useRef(null);

    return (
        <mesh ref={mesh} position={props.position}>
            <sphereGeometry args={props.size} />
            <meshBasicMaterial
                color={props.color}
                side={
                    props.type === 'double'
                        ? THREE.DoubleSide
                        : props.type === 'front'
                        ? THREE.FrontSide
                        : THREE.BackSide
                }
            />
        </mesh>
    );
}

function Space(props) {
    const mesh = useRef(null);
    const colorMap = useLoader(
        THREE.TextureLoader,
        `${process.env.PUBLIC_URL}/image/color_texture_4.png`
    );

    return (
        <mesh ref={mesh} position={props.position}>
            <sphereGeometry args={props.size} />
            <meshStandardMaterial
                map={colorMap}
                side={
                    props.type === 'double'
                        ? THREE.DoubleSide
                        : props.type === 'front'
                        ? THREE.FrontSide
                        : THREE.BackSide
                }
            />
        </mesh>
    );
}

function Star(props) {
    const params = useParams();
    const mesh = useRef(null);

    const stars = useRecoilValue(starsState);

    const isFollowState = useRecoilValue(followState);
    const setIsStarDetailOpen = useSetRecoilState(isStarDetailOpenState);
    const setIsStarRegistOpen = useSetRecoilState(isStarRegistOpenState);

    const writerIndex = Number(params['user_id']);
    const loginUserIndex = Number(
        JSON.parse(
            atob(sessionStorage.getItem('token').split(' ')[1].split('.')[1])
        ).sub
    );
    const colors = {
        true: 0xf5ff82,
        false: 'red',
    };

    // curStarState: 해당 별 객체 정보를 모두 담고 있다.
    const [curStarState, setCurStarState] = useState(null);

    const colorCheck = curStarState
        ? (isFollowState && curStarState.boardAccess === 'PARTOPEN') ||
          curStarState.boardAccess === 'OPEN' ||
          writerIndex === loginUserIndex
        : false;

    useEffect(() => {
        setCurStarState(isAddedStar.get(props.location));

        if (isAddedStar.get(props.location)) {
            constellationCheck.update(1, 0, MAX_SATR_CNT, props.location, true);
        } else {
            constellationCheck.update(
                1,
                0,
                MAX_SATR_CNT,
                props.location,
                false
            );
        }
        console.log('update');
    }, [stars]);

    const handleClick = (e, locationNum) => {
        e.stopPropagation();
        console.log(locationNum);

        const starIndex = isAddedStar.get(locationNum)
            ? isAddedStar.get(locationNum).boardIndex
            : null;
        if (starIndex) {
            // 별이 나에게 공개된 별일 때
            if (colorCheck) {
                // 별 상세 정보 띄우기
                setIsStarDetailOpen([starIndex, writerIndex]);
            } else if (!isFollowState && isAddedStar.get) {
                // 공개된 별이 아닐 때
                swal({
                    title: '비공개 별입니다',
                    icon: 'info',
                });
            }
        } else {
            // 별 등록 모달 띄우기
            if (writerIndex === loginUserIndex) {
                setIsStarRegistOpen([locationNum, writerIndex]);
            }
        }
    };

    return (
        <>
            <mesh ref={mesh} position={props.position}>
                <sphereGeometry args={props.size} />
                <meshPhongMaterial
                    // emissive={"yellow"}
                    // emissiveIntensity={0.1}
                    color={curStarState ? colors[colorCheck] : 'grey'}
                    opacity={curStarState ? 1 : 0.4}
                    transparent={true}
                />
            </mesh>
            <StarSurround
                position={props.position}
                location={props.location}
                handleClick={handleClick}
            />
        </>
    );
}

function StarSurround(props) {
    const [opacity, setOpacity] = useState(0);

    return (
        <mesh
            position={props.position}
            onClick={(e) => {
                props.handleClick(e, props.location);
            }}
            onPointerEnter={(e) => {
                setOpacity(0.05);
            }}
            onPointerLeave={() => setOpacity(0)}
        >
            <sphereGeometry args={[0.7, 48, 48]} />
            <meshStandardMaterial transparent={true} opacity={opacity} />
        </mesh>
    );
}

function GroupStar(props) {
    const stars = useRecoilValue(starsState);

    const setStarLineOpacityState = useSetRecoilState(starLineOpacityState);

    const [lineColor, setLineColor] = useState(true);
    const [renewConstellation, setRenewConstellation] = useState(false);

    const group = useRef(null);

    const position = props.position;
    const groupNum = props.groupNum;

    let startStarNum = position[0][0];
    const lastStarNum = position[position.length - 1][0];

    // 황소자리, 페가수스 자리의 경우는 다른 별자리의 별과 이어지므로 startStartNum -1 처리
    if (groupNum === 12 || groupNum === 14) {
        startStarNum--;
    }

    // 작성한 별 목록 변경 시 별자리 체크
    useEffect(() => {
        const check = constellationCheck.query(
            1,
            0,
            MAX_SATR_CNT,
            startStarNum,
            lastStarNum
        );
        if (check) {
            setLineColor(false);
        } else if (!check) {
            setLineColor(true);
        }
        console.log('renew');
    }, [stars]);

    // 하늘 회전
    useFrame((state, delta) => {
        group.current.rotation.y += delta / 250;
    });

    function handlePointerEnter() {
        setStarLineOpacityState(groupNum);
    }

    function handlePointerLeave() {
        setStarLineOpacityState(-1);
    }

    return (
        <>
            <group
                ref={group}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
            >
                {props.position.map((val, index) => (
                    <Star
                        key={index}
                        size={[0.17, 32, 32]}
                        positions={position}
                        position={val.slice(1, 4)}
                        location={val[0]}
                        setLineColor={setLineColor}
                        renewConstellation={renewConstellation}
                        setRenewConstellation={setRenewConstellation}
                        startStarNum={startStarNum}
                        lastStarNum={lastStarNum}
                    />
                ))}
                {linePosition[groupNum].map((it, index) => {
                    const pos = it.map((it) => new THREE.Vector3(...it));
                    return (
                        <Line
                            key={index}
                            points={pos}
                            lineColor={lineColor}
                            groupNum={groupNum}
                        />
                    );
                })}
            </group>
        </>
    );
}

function SceneStars() {
    const curPage = useRecoilValue(curPageState);
    const [stars, setStars] = useRecoilState(starsState);
    const setFollower = useSetRecoilState(followerState);
    const isDeleteAlertOpen = useRecoilValue(isDeleteAlertOpenState);

    const params = useParams();
    const writerIndex = Number(params.user_id);
    const loginUserId = Number(sessionStorage.getItem('memberIndex'));
    const loginUserNickname = sessionStorage.getItem('nickname');
    const [isFollowState, setIsFollowState] = useRecoilState(followState);

    useEffect(() => {
        const fetchData = async () => {
            // 게시글 리스트 불러오기

            setIsFollowState(null);

            if (!isDeleteAlertOpen) {
                await axios
                    .get(
                        `${process.env.REACT_APP_API_URL}/board/star/${writerIndex}`,
                        {
                            header: {
                                token: sessionStorage.getItem('token') ?? '',
                            },
                            params: {
                                page: curPage ?? 0,
                            },
                        }
                    )
                    .then((response) => {
                        isAddedStar.clear();

                        response.data.forEach((star) =>
                            isAddedStar.set(
                                star.boardLocation % MAX_SATR_CNT,
                                star
                            )
                        );

                        setStars([...response.data]);
                    })
                    .catch((e) => {
                        console.log(e);
                    });
            }
        };

        fetchData();
    }, [curPage, isDeleteAlertOpen, writerIndex]);

    useEffect(() => {
        let follower = [];
        // let following = [];

        async function followCheck() {
            // 공간 주인과 로그인 유저가 다를 때, 팔로잉 관계 체크 (게시물 팔로잉 공개 확인위해)
            if (writerIndex !== loginUserId) {
                await axios
                    .get(
                        `${process.env.REACT_APP_API_URL}/follow/follower/${writerIndex}`
                    )
                    .then((response) => {
                        setFollower(response.data.result);
                        follower = response.data.result;
                    })
                    .catch((e) => console.log(e));
            }
            const followerCheck = follower.some(
                (it) => it['memberId'] === loginUserNickname
            );
            setIsFollowState(followerCheck);
        }

        followCheck();
    }, [isFollowState]);

    return (
        <>
            {position.map((val, index) => {
                return (
                    <GroupStar key={index} groupNum={index} position={val} />
                );
            })}
        </>
    );
}

function SceneLights() {
    return (
        <>
            {/* 광원 */}
            {/* <directionalLight position={[0, 0, 5]} intensity={2} /> */}
            <ambientLight intensity={3} />
        </>
    );
}

function SceneEnvironment() {
    return (
        <>
            {/* 우주 배경 */}
            <Space
                size={[55, 500, 500, 0, Math.PI * 2, 0, (Math.PI * 3.5) / 5]}
                position={[0, -7, 0]}
                color={'black'}
                type={'back'}
            />

            {/* 바닥면 */}
            <Ground
                size={[2, 48, 48, 0, Math.PI * 2]}
                position={[0, -2.2, 0]}
                color={'orange'}
            />
        </>
    );
}

function FollowArea() {
    const params = useParams();
    const userId = Number(params.user_id);
    const location = useLocation();

    const [loginToken, setLoginToken] = useState(
        sessionStorage.getItem('token')
    );
    const [loginIndex, setLoginIndex] = useState(
        Number(sessionStorage.getItem('memberIndex'))
    );
    const [userName, setUserName] = useState('');
    const [isFollowState, setIsFollowState] = useRecoilState(followState);

    const handleFollow = (isFollowState) => {
        const relationData = {
            toMemberIndex: userId,
            fromMemberIndex: loginIndex,
        };
        if (isFollowState) {
            // 팔로우 취소 api 호출
            axios
                .delete(
                    `${process.env.REACT_APP_API_URL}/follow/following`,
                    {
                        data: relationData,
                    },
                    {
                        headers: {
                            token: loginToken,
                        },
                    }
                )
                .then(() => setIsFollowState(false));
        } else if (!isFollowState) {
            // 팔로우 api 호출
            axios
                .post(
                    `${process.env.REACT_APP_API_URL}/follow/following`,
                    relationData,
                    {
                        headers: {
                            token: loginToken,
                        },
                    }
                )
                .then(() => setIsFollowState(true));
        }
    };

    useEffect(() => {
        const writerIndex = Number(params.user_id);
        const loginUserId = Number(sessionStorage.getItem('memberIndex'));
        if (writerIndex !== loginUserId && location.state?.props) {
            setUserName(location.state.props);
        }
        if (writerIndex === loginUserId) {
            setUserName('');
        }
    }, [location]);

    useEffect(() => {
        setLoginToken(loginToken);
        setLoginIndex(loginIndex);
    }, [loginToken, loginIndex]);
    return (
        <>
            {userName ? (
                <div className="absolute bottom-4 left-4 flex justify-center items-center text-white">
                    <PiShootingStarFill className="mr-1" />
                    <div className="space-name font-['Pre-Bold'] text-2xl mr-2 ">
                        {userName} 의 우주
                    </div>
                    <div>
                        {userId !== loginIndex &&
                            (isFollowState === null ? (
                                <div className="font-['Pre-Light']">
                                    Loading...
                                </div>
                            ) : (
                                <button
                                    className="space-follow font-['Pre-Bold'] text-m px-3"
                                    onClick={() => handleFollow(isFollowState)}
                                >
                                    {isFollowState ? '언팔로우' : '팔로우'}
                                </button>
                            ))}
                    </div>
                </div>
            ) : (
                <Link
                    to={`/space/${sessionStorage.getItem('memberIndex')}/radio`}
                >
                    <button className="absolute bottom-2 left-2">라디오</button>
                </Link>
            )}
        </>
    );
}

function UserSpace() {
    return (
        <div className="user-space relative">
            <div
                id="canvas-container"
                style={{ height: '100vh', width: '100vw' }}
            >
                <Canvas>
                    <EffectComposer>
                        <Bloom
                            intensity={0.7}
                            luminanceThreshold={0.5}
                            kernelSize={KernelSize.VERY_LARGE}
                        />
                    </EffectComposer>
                    <SceneStars />
                    <SceneLights />
                    <SceneEnvironment />
                    <OrbitControls
                        dampingFactor={0.15}
                        target={[0, 0, 0]}
                        rotateSpeed={-0.15}
                        enableZoom={true}
                    />
                    <PerspectiveCamera
                        makeDefault
                        position={[-0.01, 0, 0.1]}
                        fov={55}
                        zoom={1}
                        aspect={window.innerWidth / window.innerHeight}
                    />
                </Canvas>
                <FollowArea />
            </div>
        </div>
    );
}

export { isAddedStar, starsState, curPageState };
export default UserSpace;
