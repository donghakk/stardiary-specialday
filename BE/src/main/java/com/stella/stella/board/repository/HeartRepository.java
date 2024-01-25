package com.stella.stella.board.repository;

import com.stella.stella.board.entity.Board;
import com.stella.stella.board.entity.Heart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HeartRepository extends JpaRepository<Heart, Long> {
    int countByBoardBoardIndex(Long BoardIndex);

    Optional<List<Heart>> findAllByMemberMemberIndex(Long MemberIndex);
}
